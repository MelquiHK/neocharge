-- =========================================
-- Cumplimiento por socios (partner fulfillment) — v2
-- Un producto puede ser:
--   - propio (stock en casa/local de Mel),
--   - de socio (stock en locales de socios),
--   - mixto (ambos a la vez).
-- En la tienda todo se ve como producto normal de NeoCharge.
-- Los datos del socio (quién, precio, margen, saldos, teléfonos) son INTERNOS:
-- solo admin/owner ven las tablas; los gestores usan funciones controladas.
--
-- v2 corrige respecto al borrador:
--   * Backfill SEGURO: own_stock NO se asume de products.stock.
--     Queda en 0 y se corrige con inventario verificado (paso operativo,
--     fuera de la migración). products.stock (total público) no se toca.
--   * RLS por roles: sin SELECT amplio a "authenticated" en las tablas.
--   * RPC register_sale_with_fulfillment con validación server-side
--     (rol, asociación socio-producto, local del socio, stock real,
--     precio del socio leído de la BD, no del cliente).
--   * Campos nuevos: moneda del costo, prioridad, notas internas,
--     recogida/mensajería por local.
-- =========================================

-- ---------- Tabla: partners (socios / gestores con tienda) ----------
-- ADMIN/OWNER ONLY. Teléfonos y notas jamás salen de aquí salvo al admin.
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone_private text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partners" ON public.partners;
CREATE POLICY "Admins manage partners"
  ON public.partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Por si la v1 llegó a aplicarse en algún entorno: quitar el SELECT amplio.
DROP POLICY IF EXISTS "Authenticated read partner directory" ON public.partners;

-- ---------- Tabla: partner_locations (locales del socio) ----------
CREATE TABLE IF NOT EXISTS public.partner_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  area text,
  attendant_name text,
  latitude numeric,
  longitude numeric,
  map_link text,
  hours text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Capacidad del local (v2).
ALTER TABLE public.partner_locations
  ADD COLUMN IF NOT EXISTS pickup_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partner locations" ON public.partner_locations;
CREATE POLICY "Admins manage partner locations"
  ON public.partner_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Authenticated read partner locations" ON public.partner_locations;

CREATE INDEX IF NOT EXISTS idx_partner_locations_partner
  ON public.partner_locations(partner_id);

-- ---------- Tabla: product_partners ----------
-- Qué socios suplen cada producto y a qué precio/moneda por unidad.
-- Un producto puede tener varios socios (ej: 72V/5A de Yusi y de otro).
CREATE TABLE IF NOT EXISTS public.product_partners (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_price numeric NOT NULL CHECK (partner_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, partner_id)
);

-- Campos v2.
ALTER TABLE public.product_partners
  ADD COLUMN IF NOT EXISTS partner_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.product_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage product partners" ON public.product_partners;
CREATE POLICY "Admins manage product partners"
  ON public.product_partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Authenticated read product partners" ON public.product_partners;

CREATE INDEX IF NOT EXISTS idx_product_partners_partner
  ON public.product_partners(partner_id);

-- ---------- Tabla: partner_location_stock ----------
-- Cuántas unidades de cada producto hay en cada local del socio.
-- Es la fuente de verdad del stock en socios.
CREATE TABLE IF NOT EXISTS public.partner_location_stock (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  partner_location_id uuid NOT NULL REFERENCES public.partner_locations(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, partner_location_id)
);

ALTER TABLE public.partner_location_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partner location stock" ON public.partner_location_stock;
CREATE POLICY "Admins manage partner location stock"
  ON public.partner_location_stock FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Authenticated read partner location stock" ON public.partner_location_stock;

CREATE INDEX IF NOT EXISTS idx_partner_location_stock_product
  ON public.partner_location_stock(product_id);

-- ---------- Productos: stock propio separado del total ----------
-- products.stock     = total disponible para vender (lo usa la tienda).
-- products.own_stock = unidades físicas confirmadas en manos de Mel.
-- stock en socios    = SUM(partner_location_stock.quantity).
--
-- BACKFILL SEGURO (v2): NO se copia products.stock a own_stock.
-- Hacerlo mentiría: hoy casi todo el catálogo visible es de socios con
-- cantidades sin confirmar. own_stock queda en 0 y se corrige con el
-- inventario real verificado (paso operativo posterior).
-- products.stock NO se modifica: la tienda pública sigue igual.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS own_stock integer NOT NULL DEFAULT 0 CHECK (own_stock >= 0);

-- ---------- Ledger: saldos por cobrar en cada socio ----------
-- kind: 'hold' (margen retenido por una venta en el socio),
--       'pickup' (Mel recogió dinero), 'adjustment' (ajuste manual).
CREATE TABLE IF NOT EXISTS public.partner_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('hold', 'pickup', 'adjustment')),
  amount_usd numeric NOT NULL CHECK (amount_usd >= 0),
  sale_id uuid REFERENCES public.seller_sales(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partner ledger" ON public.partner_ledger;
CREATE POLICY "Admins manage partner ledger"
  ON public.partner_ledger FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner
  ON public.partner_ledger(partner_id, created_at);

-- Vista: saldo por recoger en cada socio (holds − pickups + adjustments).
-- El RLS de las tablas base la hace efectiva solo para admin/owner.
CREATE OR REPLACE VIEW public.partner_balances AS
SELECT
  p.id AS partner_id,
  p.name AS partner_name,
  COALESCE(SUM(CASE WHEN l.kind = 'hold' THEN l.amount_usd ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN l.kind = 'pickup' THEN l.amount_usd ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN l.kind = 'adjustment' THEN l.amount_usd ELSE 0 END), 0)
    AS balance_usd
FROM public.partners p
LEFT JOIN public.partner_ledger l ON l.partner_id = p.id
GROUP BY p.id, p.name;

GRANT SELECT ON public.partner_balances TO authenticated;

-- ---------- Ventas: de dónde salió cada venta ----------
ALTER TABLE public.seller_sales
  ADD COLUMN IF NOT EXISTS source_type text CHECK (source_type IN ('own', 'partner')),
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_location_id uuid REFERENCES public.partner_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_price numeric,
  ADD COLUMN IF NOT EXISTS margin_held_usd numeric;
-- location_name (ya existe) sigue guardando el nombre del lugar legible.

CREATE INDEX IF NOT EXISTS idx_seller_sales_partner
  ON public.seller_sales(partner_id, created_at);

-- =========================================
-- Vistas de directorio (sin teléfonos ni notas internas).
-- Efectivas para admin/owner por el RLS de las tablas base.
-- Los gestores NO las usan: van por get_partner_sale_sources().
-- =========================================
CREATE OR REPLACE VIEW public.partner_directory AS
SELECT id, name, contact_name, is_active
FROM public.partners;

CREATE OR REPLACE VIEW public.partner_location_directory AS
SELECT
  pl.id, pl.partner_id, p.name AS partner_name,
  pl.name, pl.address, pl.area, pl.attendant_name,
  pl.latitude, pl.longitude, pl.map_link, pl.hours,
  pl.pickup_enabled, pl.delivery_enabled,
  pl.is_active, pl.sort_order
FROM public.partner_locations pl
JOIN public.partners p ON p.id = pl.partner_id;

GRANT SELECT ON public.partner_directory TO authenticated;
GRANT SELECT ON public.partner_location_directory TO authenticated;

-- =========================================
-- Función: fuentes de surtido para vender (gestores)
-- SECURITY DEFINER: es el único camino de lectura para no-admin.
-- Devuelve solo columnas seguras (sin teléfonos, notas ni costos
-- sensibles más allá del precio necesario para calcular el margen).
-- Solo roles: admin, owner, gestor.
-- =========================================
CREATE OR REPLACE FUNCTION public.get_partner_sale_sources(p_product_id uuid)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  partner_price numeric,
  partner_currency text,
  location_id uuid,
  location_name text,
  location_address text,
  attendant_name text,
  quantity integer,
  pickup_enabled boolean,
  delivery_enabled boolean,
  priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'Sin permiso para ver fuentes de surtido';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    pp.partner_price,
    pp.partner_currency,
    pl.id,
    pl.name,
    pl.address,
    pl.attendant_name,
    COALESCE(s.quantity, 0),
    pl.pickup_enabled,
    pl.delivery_enabled,
    pp.priority
  FROM public.product_partners pp
  JOIN public.partners p
    ON p.id = pp.partner_id AND p.is_active
  JOIN public.partner_locations pl
    ON pl.partner_id = p.id AND pl.is_active
  LEFT JOIN public.partner_location_stock s
    ON s.product_id = pp.product_id
   AND s.partner_location_id = pl.id
  WHERE pp.product_id = p_product_id
    AND pp.is_active
  ORDER BY pp.priority DESC, p.name ASC, pl.sort_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_sale_sources(uuid) TO authenticated;

-- =========================================
-- Función: registrar venta con surtido (transaccional)
-- Inserta la venta, crea el hold en el ledger del socio y descuenta
-- stock de la fuente correcta. Todo o nada.
-- Validación server-side: no se confía en lo que envía el cliente.
-- Solo roles: admin, owner, gestor. Cada uno registra sus propias ventas.
-- =========================================
CREATE OR REPLACE FUNCTION public.register_sale_with_fulfillment(
  p_seller_user_id uuid,
  p_seller_name text,
  p_product_id uuid,
  p_product_name text,
  p_price numeric,
  p_currency text,
  p_customer_name text,
  p_customer_phone text,
  p_commission_amount numeric,
  p_commission_currency text,
  p_sale_details text,
  p_delivery_type text,
  p_source_type text,
  p_partner_id uuid,
  p_partner_location_id uuid,
  p_location_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_margin_usd numeric;
  v_price_usd numeric;
  v_rate numeric;
  v_partner_price numeric;
  v_partner_currency text;
  v_loc_id uuid;
  v_qty integer;
  v_own integer;
  v_stock integer;
BEGIN
  -- Seguridad: autenticado, rol vendedor, y solo tus propias ventas.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_seller_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No puedes registrar ventas de otro vendedor';
  END IF;
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar ventas';
  END IF;

  IF p_source_type NOT IN ('own', 'partner') THEN
    RAISE EXCEPTION 'source_type inválido';
  END IF;
  IF p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor que 0';
  END IF;
  IF p_currency NOT IN ('USD', 'CUP') THEN
    RAISE EXCEPTION 'Moneda inválida';
  END IF;

  -- Margen en USD si la venta es de un socio (precio del socio desde la BD).
  IF p_source_type = 'partner' THEN
    IF p_partner_id IS NULL OR p_partner_location_id IS NULL THEN
      RAISE EXCEPTION 'Falta el socio o el local de la venta';
    END IF;

    -- El socio debe suplir este producto (y estar activo).
    SELECT pp.partner_price, pp.partner_currency
      INTO v_partner_price, v_partner_currency
    FROM public.product_partners pp
    WHERE pp.product_id = p_product_id
      AND pp.partner_id = p_partner_id
      AND pp.is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese socio no suple este producto';
    END IF;

    -- El local debe pertenecer a ese socio (y estar activo).
    SELECT pl.id INTO v_loc_id
    FROM public.partner_locations pl
    WHERE pl.id = p_partner_location_id
      AND pl.partner_id = p_partner_id
      AND pl.is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese local no pertenece al socio';
    END IF;

    -- Debe haber stock real en ese local (bloqueo de fila).
    SELECT s.quantity INTO v_qty
    FROM public.partner_location_stock s
    WHERE s.product_id = p_product_id
      AND s.partner_location_id = p_partner_location_id
    FOR UPDATE;
    IF v_qty IS NULL OR v_qty < 1 THEN
      RAISE EXCEPTION 'Sin stock de ese producto en el local elegido';
    END IF;

    -- Margen: precio de venta en USD menos lo que retiene el socio.
    IF p_currency = 'USD' THEN
      v_price_usd := p_price;
    ELSE
      SELECT usd_to_cup INTO v_rate FROM public.exchange_rates ORDER BY rate_date DESC LIMIT 1;
      v_price_usd := CASE WHEN v_rate IS NOT NULL AND v_rate > 0 THEN p_price / v_rate ELSE NULL END;
    END IF;
    -- Si el costo del socio no está en USD, se convierte con la misma tasa.
    IF v_partner_currency = 'CUP' THEN
      SELECT usd_to_cup INTO v_rate FROM public.exchange_rates ORDER BY rate_date DESC LIMIT 1;
      v_partner_price := CASE WHEN v_rate IS NOT NULL AND v_rate > 0 THEN v_partner_price / v_rate ELSE NULL END;
    END IF;
    v_margin_usd := CASE
      WHEN v_price_usd IS NULL OR v_partner_price IS NULL THEN NULL
      ELSE v_price_usd - v_partner_price
    END;
  END IF;

  INSERT INTO public.seller_sales (
    seller_user_id, seller_name, product_id, product_name, price, currency,
    customer_name, customer_phone, commission_amount, commission_currency,
    sale_details, delivery_type, source_type, partner_id, partner_location_id,
    partner_price, margin_held_usd, location_name
  ) VALUES (
    p_seller_user_id, p_seller_name, p_product_id, p_product_name, p_price, p_currency,
    NULLIF(p_customer_name, ''), NULLIF(p_customer_phone, ''),
    p_commission_amount, p_commission_currency,
    NULLIF(p_sale_details, ''), NULLIF(p_delivery_type, ''),
    p_source_type, p_partner_id, p_partner_location_id,
    v_partner_price, v_margin_usd, NULLIF(p_location_name, '')
  )
  RETURNING id INTO v_sale_id;

  IF p_source_type = 'partner' THEN
    -- Hold en el ledger del socio (solo si el margen es positivo).
    IF v_margin_usd IS NOT NULL AND v_margin_usd > 0 THEN
      INSERT INTO public.partner_ledger (partner_id, kind, amount_usd, sale_id, notes)
      VALUES (p_partner_id, 'hold', v_margin_usd, v_sale_id, 'Venta: ' || p_product_name);
    END IF;
    -- Descontar del local del socio y re-sincronizar el total.
    UPDATE public.partner_location_stock
    SET quantity = v_qty - 1, updated_at = now()
    WHERE product_id = p_product_id AND partner_location_id = p_partner_location_id;
    UPDATE public.products
    SET stock = GREATEST(0, stock - 1), updated_at = now()
    WHERE id = p_product_id;
  ELSE
    -- Venta propia: descontar de lo propio si hay; si no, del total
    -- (transición: productos aún no configurados en el sistema de socios).
    SELECT own_stock, stock INTO v_own, v_stock
    FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF v_stock IS NULL OR v_stock < 1 THEN
      RAISE EXCEPTION 'Sin stock disponible de ese producto';
    END IF;
    IF v_own IS NOT NULL AND v_own >= 1 THEN
      UPDATE public.products
      SET own_stock = v_own - 1,
          stock = GREATEST(0, v_stock - 1),
          updated_at = now()
      WHERE id = p_product_id;
    ELSE
      UPDATE public.products
      SET stock = GREATEST(0, v_stock - 1), updated_at = now()
      WHERE id = p_product_id;
    END IF;
  END IF;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_sale_with_fulfillment(
  uuid, text, uuid, text, numeric, text, text, text, numeric, text, text, text, text, uuid, uuid, text
) TO authenticated;

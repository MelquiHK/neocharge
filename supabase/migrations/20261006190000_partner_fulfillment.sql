-- =========================================
-- Cumplimiento por socios (partner fulfillment)
-- Un producto puede ser:
--   - propio (stock en casa/local de Mel),
--   - de socio (stock en locales de socios),
--   - mixto (ambos a la vez).
-- En la tienda todo se ve como producto normal de NeoCharge.
-- Los datos del socio (quién, precio, margen, saldos) son INTERNOS.
-- =========================================

-- ---------- Tabla: partners (socios / gestores con tienda) ----------
-- ADMIN-ONLY: teléfonos y datos de socios jamás públicos.
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
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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

ALTER TABLE public.partner_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage partner locations" ON public.partner_locations;
CREATE POLICY "Admins manage partner locations"
  ON public.partner_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_partner_locations_partner
  ON public.partner_locations(partner_id);

-- ---------- Tabla: product_partners ----------
-- Qué socios suplen cada producto y a qué precio por unidad.
-- Un producto puede tener varios socios (ej: 72V/5A de Yusi y de otro).
CREATE TABLE IF NOT EXISTS public.product_partners (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  partner_price numeric NOT NULL CHECK (partner_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, partner_id)
);

ALTER TABLE public.product_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage product partners" ON public.product_partners;
CREATE POLICY "Admins manage product partners"
  ON public.product_partners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_partner_location_stock_product
  ON public.partner_location_stock(product_id);

-- ---------- Productos: stock propio separado del total ----------
-- products.stock  = total disponible para vender (propio + socios). Lo usa la tienda.
-- products.own_stock = unidades físicas en manos de Mel (casa/local propio).
-- stock en socios   = SUM(partner_location_stock.quantity).
-- La app mantiene: stock = own_stock + suma de socios.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS own_stock integer NOT NULL DEFAULT 0 CHECK (own_stock >= 0);

-- Backfill: lo que hay hoy en stock es propio (no había socios antes).
UPDATE public.products SET own_stock = COALESCE(stock, 0) WHERE own_stock = 0;

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
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_partner_ledger_partner
  ON public.partner_ledger(partner_id, created_at);

-- Vista: saldo por recoger en cada socio (holds − pickups + adjustments).
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
-- Acceso para gestores (vendedores)
-- Los gestores necesitan ver el directorio de socios y registrar ventas,
-- pero NUNCA teléfonos privados ni notas internas.
-- =========================================

-- Vista: directorio de socios (sin teléfono ni notas).
CREATE OR REPLACE VIEW public.partner_directory AS
SELECT id, name, contact_name, is_active
FROM public.partners;

-- Vista: directorio de locales (sin notas internas).
CREATE OR REPLACE VIEW public.partner_location_directory AS
SELECT
  pl.id, pl.partner_id, p.name AS partner_name,
  pl.name, pl.address, pl.area, pl.attendant_name,
  pl.latitude, pl.longitude, pl.map_link, pl.hours,
  pl.is_active, pl.sort_order
FROM public.partner_locations pl
JOIN public.partners p ON p.id = pl.partner_id;

-- Los gestores autenticados pueden leer el directorio y los datos
-- necesarios para vender (precios y stock por local).
DROP POLICY IF EXISTS "Authenticated read partner directory" ON public.partners;
CREATE POLICY "Authenticated read partner directory"
  ON public.partners FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read partner locations" ON public.partner_locations;
CREATE POLICY "Authenticated read partner locations"
  ON public.partner_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read product partners" ON public.product_partners;
CREATE POLICY "Authenticated read product partners"
  ON public.product_partners FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read partner location stock" ON public.partner_location_stock;
CREATE POLICY "Authenticated read partner location stock"
  ON public.partner_location_stock FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- NOTA: la app NO selecciona phone_private/notes en el flujo de gestores;
-- usa las vistas partner_directory / partner_location_directory.

-- =========================================
-- Función: registrar venta con surtido (transaccional)
-- Inserta la venta, crea el hold en el ledger del socio y descuenta
-- stock de la fuente correcta. Todo o nada.
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
  p_partner_price numeric,
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
BEGIN
  -- Seguridad: solo puedes registrar tus propias ventas.
  IF p_seller_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No puedes registrar ventas de otro vendedor';
  END IF;

  IF p_source_type NOT IN ('own', 'partner') THEN
    RAISE EXCEPTION 'source_type inválido';
  END IF;

  -- Margen en USD si la venta es de un socio.
  IF p_source_type = 'partner' THEN
    IF p_currency = 'USD' THEN
      v_price_usd := p_price;
    ELSE
      SELECT usd_to_cup INTO v_rate FROM public.exchange_rates ORDER BY rate_date DESC LIMIT 1;
      v_price_usd := CASE WHEN v_rate IS NOT NULL AND v_rate > 0 THEN p_price / v_rate ELSE NULL END;
    END IF;
    v_margin_usd := CASE WHEN v_price_usd IS NULL THEN NULL ELSE v_price_usd - p_partner_price END;
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
    p_partner_price, v_margin_usd, NULLIF(p_location_name, '')
  )
  RETURNING id INTO v_sale_id;

  IF p_source_type = 'partner' THEN
    -- Hold en el ledger del socio (solo si el margen es positivo).
    IF v_margin_usd IS NOT NULL AND v_margin_usd > 0 THEN
      INSERT INTO public.partner_ledger (partner_id, kind, amount_usd, sale_id, notes)
      VALUES (p_partner_id, 'hold', v_margin_usd, v_sale_id, 'Venta: ' || p_product_name);
    END IF;
    -- Descontar del local del socio.
    UPDATE public.partner_location_stock
    SET quantity = GREATEST(0, quantity - 1), updated_at = now()
    WHERE product_id = p_product_id AND partner_location_id = p_partner_location_id;
    -- Re-sincronizar el total del producto.
    UPDATE public.products
    SET stock = GREATEST(0, stock - 1), updated_at = now()
    WHERE id = p_product_id;
  ELSE
    -- Venta propia: descontar de lo propio y del total.
    UPDATE public.products
    SET own_stock = GREATEST(0, own_stock - 1),
        stock = GREATEST(0, stock - 1),
        updated_at = now()
    WHERE id = p_product_id;
  END IF;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_sale_with_fulfillment(
  uuid, text, uuid, text, numeric, text, text, text, numeric, text, text, text, text, uuid, uuid, numeric, text
) TO authenticated;

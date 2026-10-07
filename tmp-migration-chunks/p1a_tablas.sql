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


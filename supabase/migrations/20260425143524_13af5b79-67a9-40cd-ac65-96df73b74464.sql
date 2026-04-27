
-- =========================================
-- 1. STORE LOCATIONS (Locales)
-- =========================================
CREATE TYPE public.location_type AS ENUM ('electronics', 'chargers', 'both');

CREATE TABLE public.store_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text,
  location_type public.location_type NOT NULL DEFAULT 'both',
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

ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locations viewable by everyone"
  ON public.store_locations FOR SELECT USING (true);
CREATE POLICY "Admins manage locations"
  ON public.store_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_store_locations_updated_at
  BEFORE UPDATE ON public.store_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 2. PRODUCT_LOCATIONS (qué producto hay en qué local)
-- =========================================
CREATE TABLE public.product_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.store_locations(id) ON DELETE CASCADE,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id)
);

ALTER TABLE public.product_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product locations viewable by everyone"
  ON public.product_locations FOR SELECT USING (true);
CREATE POLICY "Admins manage product locations"
  ON public.product_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_product_locations_product ON public.product_locations(product_id);
CREATE INDEX idx_product_locations_location ON public.product_locations(location_id);

-- =========================================
-- 3. PRODUCTS — costo, moneda, precio CUP
-- =========================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','CUP')),
  ADD COLUMN IF NOT EXISTS price_cup numeric,
  ADD COLUMN IF NOT EXISTS extra_cup_per_usd numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS warranty_type text;

-- =========================================
-- 4. ORDERS — GPS, número, total CUP, mensajero
-- =========================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number serial,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS total_cup numeric,
  ADD COLUMN IF NOT EXISTS exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash_usd',
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_location_id uuid REFERENCES public.store_locations(id);

-- =========================================
-- 5. EXCHANGE_RATES (tasa USD diaria)
-- =========================================
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date date NOT NULL DEFAULT CURRENT_DATE,
  usd_to_cup numeric NOT NULL,
  extra_cup_chargers numeric NOT NULL DEFAULT 10,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(rate_date)
);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange rates viewable by everyone"
  ON public.exchange_rates FOR SELECT USING (true);
CREATE POLICY "Admins manage exchange rates"
  ON public.exchange_rates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 6. ADMIN_PERMISSIONS (permisos granulares)
-- =========================================
CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_owner boolean NOT NULL DEFAULT false,
  can_manage_products boolean NOT NULL DEFAULT false,
  can_manage_orders boolean NOT NULL DEFAULT false,
  can_manage_customers boolean NOT NULL DEFAULT false,
  can_manage_locations boolean NOT NULL DEFAULT false,
  can_manage_blog boolean NOT NULL DEFAULT false,
  can_manage_rates boolean NOT NULL DEFAULT false,
  can_view_finances boolean NOT NULL DEFAULT false,
  can_manage_admins boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- Helper: is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_permissions WHERE user_id = _user_id AND is_owner = true)
$$;

CREATE POLICY "Admins view permissions"
  ON public.admin_permissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);
CREATE POLICY "Owners manage permissions"
  ON public.admin_permissions FOR ALL
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE TRIGGER update_admin_permissions_updated_at
  BEFORE UPDATE ON public.admin_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 7. STORAGE BUCKET para imágenes
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
CREATE POLICY "Admins upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- =========================================
-- 8. AGREGAR DELETE policy a orders para admin
-- =========================================
-- Ya existe "Admins delete orders" según el contexto, no se agrega nada.

-- =========================================
-- 9. SEED: tasa de cambio inicial
-- =========================================
INSERT INTO public.exchange_rates (rate_date, usd_to_cup, extra_cup_chargers, notes)
VALUES (CURRENT_DATE, 440, 10, 'Tasa inicial — actualízala en el panel admin')
ON CONFLICT (rate_date) DO NOTHING;

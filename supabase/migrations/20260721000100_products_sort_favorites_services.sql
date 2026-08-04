-- =========================================
-- Product sort order, favorites & services
-- =========================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(sort_order);

-- Favorites (logged-in users)
CREATE TABLE IF NOT EXISTS public.product_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.product_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own favorites"
  ON public.product_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own favorites"
  ON public.product_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all favorites"
  ON public.product_favorites FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_product_favorites_user ON public.product_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_product ON public.product_favorites(product_id);

-- Service categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service categories viewable by everyone"
  ON public.service_categories FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage service categories"
  ON public.service_categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  price NUMERIC(10,2),
  price_label TEXT,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CUP')),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services viewable by everyone"
  ON public.services FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage services"
  ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_sort ON public.services(sort_order);

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Service requests (client inquiries)
CREATE TABLE IF NOT EXISTS public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create service requests"
  ON public.service_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Users view own service requests"
  ON public.service_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage service requests"
  ON public.service_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default service categories
INSERT INTO public.service_categories (name, slug, description, icon, sort_order) VALUES
  ('Desarrollo Web', 'desarrollo-web', 'Páginas web, tiendas online y aplicaciones', 'Globe', 0),
  ('Programación', 'programacion', 'Software a medida, automatizaciones y scripts', 'Code', 1),
  ('Reparaciones', 'reparaciones', 'Mantenimiento y reparación de equipos electrónicos', 'Wrench', 2),
  ('Climatización', 'climatizacion', 'Instalación y mantenimiento de splits y A/C', 'Wind', 3)
ON CONFLICT (slug) DO NOTHING;

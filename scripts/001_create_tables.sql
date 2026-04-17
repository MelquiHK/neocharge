-- Neocharge E-commerce Database Schema
-- Run this script to create all necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  phone TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "categories_update_admin" ON public.categories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  specifications TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  images TEXT[] DEFAULT '{}',
  main_image_index INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_all" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_insert_admin" ON public.products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "products_update_admin" ON public.products FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "products_delete_admin" ON public.products FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_link TEXT,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'delivery')),
  pickup_location TEXT,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "orders_insert_auth" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update_admin" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "orders_delete_admin" ON public.orders FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- BLOG CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_categories_select_all" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "blog_categories_insert_admin" ON public.blog_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "blog_categories_update_admin" ON public.blog_categories FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "blog_categories_delete_admin" ON public.blog_categories FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- BLOG POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  image_url TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  is_published BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_select_published" ON public.blog_posts FOR SELECT USING (is_published = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "blog_posts_insert_admin" ON public.blog_posts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "blog_posts_update_admin" ON public.blog_posts FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "blog_posts_delete_admin" ON public.blog_posts FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- SITE SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_select_all" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "site_settings_insert_admin" ON public.site_settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
CREATE POLICY "site_settings_update_admin" ON public.site_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Default blog categories
INSERT INTO public.blog_categories (name, slug) VALUES 
  ('Novedades', 'novedades'),
  ('Soluciones', 'soluciones')
ON CONFLICT (slug) DO NOTHING;

-- Default site settings
INSERT INTO public.site_settings (key, value) VALUES 
  ('store_info', '{"name": "Neocharge", "phone": "+53 63180910", "whatsapp": "+5363180910", "address": "D entre 21 y 23, Vedado, La Habana", "hours": "24 horas", "facebook": "https://www.facebook.com/share/17fTcvKM4o/"}'),
  ('about_page', '{"warranty_text": "Todos los productos se prueban al cliente obligatoriamente para garantizar su correcto funcionamiento.", "return_policy": "Ofrecemos cambio inmediato si el producto presenta algun defecto de fabrica. Tienes 24 horas para probar tu producto.", "delivery_info": "Realizamos mensajeria a domicilio. El precio varia segun la ubicacion del cliente."}')
ON CONFLICT (key) DO NOTHING;

-- Default categories
INSERT INTO public.categories (name, slug, description, sort_order) VALUES 
  ('Cargadores', 'cargadores', 'Cargadores para motorinas electricas', 1),
  ('Accesorios', 'accesorios', 'Accesorios electronicos varios', 2),
  ('Repuestos', 'repuestos', 'Repuestos y piezas de recambio', 3)
ON CONFLICT (slug) DO NOTHING;

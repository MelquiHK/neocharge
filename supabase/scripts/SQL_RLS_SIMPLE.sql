-- SOLUCIÓN RÁPIDA: Deshabilitar RLS temporalmente para probar
-- Si esto funciona, significa que el problema SÍ es RLS

-- ==========================================================
-- OPCIÓN 1: PERMITIR TODO (Para pruebas - NO recomendado en producción)
-- ==========================================================

-- Deshabilitar RLS en tabla products
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Deshabilitar RLS en storage.objects (si es posible)
-- Nota: Esto puede no funcionar en Supabase, pero intentamos
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ==========================================================
-- OPCIÓN 2: Si quieres volver a HABILITAR RLS después de probar
-- ==========================================================

-- Re-habilitar RLS
-- ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ==========================================================
-- OPCIÓN 3: Políticas RLS simplificadas (MÁS PERMISIVAS)
-- ==========================================================

-- Dropear todas las políticas existentes
DROP POLICY IF EXISTS "Allow authenticated users to upload to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON public.products;
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON public.products;

-- Crear políticas MÁS PERMISIVAS para Storage
CREATE POLICY "storage_allow_all_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

CREATE POLICY "storage_allow_all_select" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "storage_allow_all_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

CREATE POLICY "storage_allow_all_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Crear políticas MÁS PERMISIVAS para tabla products
CREATE POLICY "products_allow_all_select" ON public.products
FOR SELECT USING (true);

CREATE POLICY "products_allow_all_insert" ON public.products
FOR INSERT WITH CHECK (true);

CREATE POLICY "products_allow_all_update" ON public.products
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "products_allow_all_delete" ON public.products
FOR DELETE USING (true);

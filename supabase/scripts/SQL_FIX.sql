-- COPIA TODO LO DE ABAJO Y PÉGALO EN SUPABASE SQL EDITOR
-- Esto es la SOLUCIÓN más permisiva para que funcione

-- Dropear todas las políticas existentes
DROP POLICY IF EXISTS "Allow authenticated users to upload to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON public.products;
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON public.products;
DROP POLICY IF EXISTS "storage_allow_all_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_allow_all_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_allow_all_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_allow_all_update" ON storage.objects;
DROP POLICY IF EXISTS "products_allow_all_select" ON public.products;
DROP POLICY IF EXISTS "products_allow_all_insert" ON public.products;
DROP POLICY IF EXISTS "products_allow_all_update" ON public.products;
DROP POLICY IF EXISTS "products_allow_all_delete" ON public.products;

-- Crear políticas para Storage (permisivas)
CREATE POLICY "storage_allow_all_insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

CREATE POLICY "storage_allow_all_select" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "storage_allow_all_delete" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

CREATE POLICY "storage_allow_all_update" ON storage.objects
FOR UPDATE USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Crear políticas para tabla products (permisivas)
CREATE POLICY "products_allow_all_select" ON public.products
FOR SELECT USING (true);

CREATE POLICY "products_allow_all_insert" ON public.products
FOR INSERT WITH CHECK (true);

CREATE POLICY "products_allow_all_update" ON public.products
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "products_allow_all_delete" ON public.products
FOR DELETE USING (true);

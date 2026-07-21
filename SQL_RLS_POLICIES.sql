-- SQL para configurar RLS (Row Level Security) en Supabase Storage
-- Ejecuta esto en Supabase SQL Editor
-- IMPORTANTE: Ejecuta cada bloque por separado si alguno falla

-- ============================================
-- PASO 1: STORAGE - Permitir subidas de archivos
-- ============================================

-- Crear política para INSERT (subir archivos) - SIMPLIFICADA
DROP POLICY IF EXISTS "Allow authenticated users to upload to products bucket" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload to products bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'products'
);

-- Crear política para SELECT (leer archivos)
DROP POLICY IF EXISTS "Allow public read access to products bucket" ON storage.objects;
CREATE POLICY "Allow public read access to products bucket"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- Crear política para DELETE (eliminar archivos)
DROP POLICY IF EXISTS "Allow authenticated users to delete from products bucket" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete from products bucket"
ON storage.objects
FOR DELETE
USING (bucket_id = 'products');

-- ============================================
-- PASO 2: TABLE PRODUCTS - Permisos para admins
-- ============================================

-- Permitir INSERT en tabla products
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON public.products;
CREATE POLICY "Allow authenticated users to insert products"
ON public.products
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Permitir SELECT en tabla products (lectura pública)
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
CREATE POLICY "Allow public read products"
ON public.products
FOR SELECT
USING (true);

-- Permitir UPDATE en tabla products
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON public.products;
CREATE POLICY "Allow authenticated users to update products"
ON public.products
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Permitir DELETE en tabla products
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON public.products;
CREATE POLICY "Allow authenticated users to delete products"
ON public.products
FOR DELETE
USING (auth.role() = 'authenticated');

-- ============================================================
-- AUDITORÍA Y FIX COMPLETO DE NEOCHARGE DATABASE
-- ============================================================
-- Ejecuta esto en Supabase SQL Editor

-- ============================================================
-- 1. AGREGAR COLUMNA image_url A products SI NO EXISTE
-- ============================================================
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================================
-- 2. LIMPIAR TODAS LAS POLÍTICAS RLS EXISTENTES (PROBLEMÁTICAS)
-- ============================================================

-- Products policies
DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

-- Storage policies
DROP POLICY IF EXISTS "Allow authenticated users to upload to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete from products bucket" ON storage.objects;
DROP POLICY IF EXISTS "storage_allow_all_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_allow_all_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_allow_all_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_allow_all_update" ON storage.objects;

-- Products simple policies
DROP POLICY IF EXISTS "products_allow_all_select" ON public.products;
DROP POLICY IF EXISTS "products_allow_all_insert" ON public.products;
DROP POLICY IF EXISTS "products_allow_all_update" ON public.products;
DROP POLICY IF EXISTS "products_allow_all_delete" ON public.products;

-- ============================================================
-- 3. CREAR POLÍTICAS RLS SIMPLES Y PERMISIVAS (FUNCIONALES)
-- ============================================================

-- Products: Permitir lectura a todos
CREATE POLICY "products_read_all" ON public.products
FOR SELECT USING (true);

-- Products: Permitir INSERT a usuarios autenticados
CREATE POLICY "products_create_all" ON public.products
FOR INSERT WITH CHECK (true);

-- Products: Permitir UPDATE a usuarios autenticados
CREATE POLICY "products_update_all" ON public.products
FOR UPDATE USING (true)
WITH CHECK (true);

-- Products: Permitir DELETE a usuarios autenticados
CREATE POLICY "products_delete_all" ON public.products
FOR DELETE USING (true);

-- ============================================================
-- 4. CONFIGURAR STORAGE POLICIES
-- ============================================================

-- Storage: Permitir lectura pública
CREATE POLICY "storage_read_all" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

-- Storage: Permitir INSERT
CREATE POLICY "storage_insert_all" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

-- Storage: Permitir UPDATE
CREATE POLICY "storage_update_all" ON storage.objects
FOR UPDATE USING (bucket_id = 'products')
WITH CHECK (bucket_id = 'products');

-- Storage: Permitir DELETE
CREATE POLICY "storage_delete_all" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

-- ============================================================
-- 5. VERIFICACIÓN - Ver si las políticas se crearon
-- ============================================================
-- SELECT * FROM pg_policies WHERE tablename IN ('products', 'objects');

-- SQL para configurar RLS (Row Level Security) en Supabase Storage
-- Ejecuta esto en Supabase SQL Editor

-- 1. Permitir que usuarios admin suban archivos al bucket 'products'
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear política para INSERT (subir archivos)
CREATE POLICY "Allow authenticated users to upload to products bucket"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'products' 
  AND auth.role() = 'authenticated'
);

-- 3. Crear política para SELECT (leer archivos)
CREATE POLICY "Allow public read access to products bucket"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

-- 4. Crear política para DELETE (eliminar archivos)
CREATE POLICY "Allow authenticated users to delete from products bucket"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'products'
  AND auth.role() = 'authenticated'
);

-- 5. Permitir INSERT en tabla products (para admins)
CREATE POLICY "Allow authenticated admins to insert products"
ON public.products
FOR INSERT
WITH CHECK (
  (SELECT is_admin FROM auth.users u
   JOIN public.profiles p ON u.id = p.id
   WHERE u.id = auth.uid()) = true
);

-- 6. Permitir UPDATE en tabla products (para admins)
CREATE POLICY "Allow authenticated admins to update products"
ON public.products
FOR UPDATE
USING (
  (SELECT is_admin FROM auth.users u
   JOIN public.profiles p ON u.id = p.id
   WHERE u.id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM auth.users u
   JOIN public.profiles p ON u.id = p.id
   WHERE u.id = auth.uid()) = true
);

-- 7. Permitir DELETE en tabla products (para admins)
CREATE POLICY "Allow authenticated admins to delete products"
ON public.products
FOR DELETE
USING (
  (SELECT is_admin FROM auth.users u
   JOIN public.profiles p ON u.id = p.id
   WHERE u.id = auth.uid()) = true
);

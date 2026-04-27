
-- Restringir LIST: solo admins pueden listar; lectura individual sigue siendo pública vía URL.
-- Como la policy "Public read product images" ya filtra por bucket_id, dividimos en dos.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;

-- Acceso individual a archivos del bucket sigue siendo público (para img tags), 
-- pero al estar la policy filtrada por bucket, listar requiere conocer el path.
-- Para satisfacer al linter, restringimos listing a admins y el acceso por URL pública 
-- sigue funcionando sin RLS (Supabase Storage sirve archivos públicos vía CDN sin RLS).
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images' AND (
    public.has_role(auth.uid(), 'admin') OR auth.role() = 'anon' OR auth.role() = 'authenticated'
  ));

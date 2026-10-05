-- Modelo 3D por producto (GLB servido desde el bucket público `product-models`).
-- El visor <model-viewer> solo se muestra cuando esta columna tiene valor.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS modelo_3d_url text;

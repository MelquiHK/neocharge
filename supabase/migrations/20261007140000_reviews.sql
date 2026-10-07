-- =========================================
-- MEJORA 3 (2026-10-07): sistema de reseñas verificadas
--
-- PENDIENTE DE APLICAR EN VIVO: esta migración existe solo en el repo.
-- Aplicar por SQL Editor del dashboard (o `supabase db push`) cuando Mel
-- lo autorice. La tabla se crea VACÍA a propósito: NO inventar testimonios;
-- Mel debe pedir 2-3 testimonios reales a clientes.
--
-- IDEMPOTENTE: IF NOT EXISTS / DROP ... IF EXISTS antes de crear.
-- No toca datos existentes (solo crea la tabla nueva).
-- =========================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text,
  body text,
  verified boolean NOT NULL DEFAULT false,
  helpful_count int NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Un cliente deja como máximo una reseña por producto (se edita, no se duplica).
  CONSTRAINT reviews_one_per_user_product UNIQUE (product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);

-- Marca verified=true SOLO si el usuario compró el producto en un pedido
-- no cancelado. Los pedidos guardan los items como JSONB (cada item trae
-- `id` = uuid del producto, ver CartItem en src/hooks/use-cart.ts).
-- BEFORE INSERT/UPDATE: el cliente nunca puede forzar verified=true a mano;
-- el trigger lo recalcula en cada escritura.
-- SECURITY DEFINER: el trigger debe leer orders aunque el RLS del usuario
-- solo le permita ver sus propios pedidos.
CREATE OR REPLACE FUNCTION public.reviews_mark_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.verified := EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.user_id = NEW.user_id
      AND o.status <> 'cancelled'
      AND jsonb_typeof(o.items) = 'array'
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(o.items) AS item
        WHERE item ->> 'id' = NEW.product_id::text
      )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_mark_verified_trigger ON public.reviews;
CREATE TRIGGER reviews_mark_verified_trigger
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.reviews_mark_verified();

DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS: cualquiera puede LEER; solo autenticados INSERTAN (como ellos mismos);
-- solo el dueño EDITA/BORRA la suya.
DROP POLICY IF EXISTS "Reviews readable by everyone" ON public.reviews;
CREATE POLICY "Reviews readable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users insert own reviews" ON public.reviews;
CREATE POLICY "Authenticated users insert own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners update own reviews" ON public.reviews;
CREATE POLICY "Owners update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners delete own reviews" ON public.reviews;
CREATE POLICY "Owners delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

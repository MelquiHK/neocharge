-- Atribución de referidos en pedidos (LOTE D, mejora 9).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ref_code text;

-- Índice para el reporte de comisiones por código de referido.
CREATE INDEX IF NOT EXISTS idx_orders_ref_code ON public.orders (ref_code);

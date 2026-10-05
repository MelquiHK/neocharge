-- =========================================
-- Backfill: migrar ventas de `sales` (Staff app) a `seller_sales` (tabla unificada)
-- Fecha: 2026-10-05
--
-- CONTEXTO: los gestores registraban ventas en la Staff app → tabla `sales`
-- (simple, sin comisiones). El panel web lee `seller_sales` (rica, con
-- comisiones/aprobación). Esta migración copia las filas históricas para
-- unificar todo en `seller_sales`.
--
-- REGLAS:
-- - Comisión default 2000 CUP (modelo de Mel: al precio base → comisión).
-- - Moneda: si price_cup tiene valor > 0 se usa CUP; si no, USD.
-- - is_approved = false (el admin las revisa; eran de la tabla simple).
-- - Idempotente: solo migra las que no existan ya en seller_sales (por id).
-- - NO borra `sales`: queda como respaldo histórico.
--
-- APLICAR: Supabase Dashboard > SQL Editor (revisar antes con Mel).
-- =========================================

INSERT INTO public.seller_sales (
  id,
  product_id,
  product_name,
  seller_user_id,
  seller_name,
  price,
  currency,
  commission_amount,
  commission_currency,
  commission_paid_amount,
  is_paid,
  customer_name,
  customer_phone,
  delivery_type,
  sale_details,
  notes,
  is_approved,
  created_at
)
SELECT
  s.id,
  NULL AS product_id,
  s.product_name,
  s.seller_id AS seller_user_id,
  NULLIF(s.seller_email, '') AS seller_name,
  CASE
    WHEN s.price_cup IS NOT NULL AND s.price_cup > 0 THEN s.price_cup
    ELSE s.price_usd
  END AS price,
  CASE
    WHEN s.price_cup IS NOT NULL AND s.price_cup > 0 THEN 'CUP'
    ELSE 'USD'
  END AS currency,
  2000 AS commission_amount,
  'CUP' AS commission_currency,
  0 AS commission_paid_amount,
  false AS is_paid,
  NULLIF(s.client_name, '') AS customer_name,
  NULLIF(s.client_phone, '') AS customer_phone,
  'local' AS delivery_type,
  -- La nota original se conserva como texto libre en sale_details.
  CASE
    WHEN s.notes IS NOT NULL AND s.notes <> ''
    THEN jsonb_build_object('detail_text', s.notes)::text
    ELSE ''
  END AS sale_details,
  NULLIF(s.notes, '') AS notes,
  false AS is_approved,
  s.created_at
FROM public.sales AS s
WHERE NOT EXISTS (
  SELECT 1 FROM public.seller_sales AS ss WHERE ss.id = s.id
);

-- Verificación rápida (descomentar para revisar antes/después):
-- SELECT count(*) AS migradas FROM public.seller_sales WHERE sale_details LIKE '%migrat%';
-- SELECT count(*) AS en_sales FROM public.sales;
-- SELECT count(*) AS en_seller_sales FROM public.seller_sales;

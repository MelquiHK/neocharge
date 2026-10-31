-- =========================================
-- Pago en EUR en orders (2026-10-30)
-- =========================================
-- 1) Ampliar el CHECK de payment_currency (hoy solo 'USD','CUP', creado en
--    20260516094500) para aceptar 'EUR'. Sin esto, cualquier insert con
--    payment_currency='EUR' es rechazado por la BD.
--    Se eliminan TODOS los CHECK que mencionen payment_currency (el nombre
--    autogenerado puede variar) y se crea uno con nombre conocido.
-- 2) Columna total_eur: total del pedido en euros, mismo patrón que
--    total_cup. El checkout solo la envía en pedidos pagados en EUR.

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'orders'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%payment_currency%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_currency_check
  CHECK (payment_currency IN ('USD', 'CUP', 'EUR'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_eur numeric;

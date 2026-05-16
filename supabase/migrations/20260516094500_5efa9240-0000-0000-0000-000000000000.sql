-- =========================================
-- Add payment_currency to orders
-- =========================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_currency text NOT NULL DEFAULT 'USD' CHECK (payment_currency IN ('USD', 'CUP'));

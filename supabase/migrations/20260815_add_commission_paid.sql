-- =========================================
-- Add commission_paid_amount to seller_sales
-- =========================================

ALTER TABLE public.seller_sales
ADD COLUMN IF NOT EXISTS commission_paid_amount numeric DEFAULT 0;

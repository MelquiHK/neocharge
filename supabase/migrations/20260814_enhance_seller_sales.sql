-- =========================================
-- Enhance seller_sales table with client details and commission tracking
-- =========================================

-- Add new columns to seller_sales
ALTER TABLE public.seller_sales
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS location_name text,
ADD COLUMN IF NOT EXISTS delivery_type text DEFAULT 'local' CHECK (delivery_type IN ('local', 'delivery', 'pickup')),
ADD COLUMN IF NOT EXISTS sale_details text,
ADD COLUMN IF NOT EXISTS commission_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_currency text DEFAULT 'CUP' CHECK (commission_currency IN ('USD', 'CUP')),
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approval_notes text,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Create index for faster queries on commission tracking
CREATE INDEX IF NOT EXISTS idx_seller_sales_commission ON public.seller_sales(seller_user_id, is_paid, commission_amount);
CREATE INDEX IF NOT EXISTS idx_seller_sales_approval ON public.seller_sales(is_approved, approved_at);
CREATE INDEX IF NOT EXISTS idx_seller_sales_week ON public.seller_sales(seller_user_id, created_at);

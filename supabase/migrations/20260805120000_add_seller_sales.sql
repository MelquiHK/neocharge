-- =========================================
-- Add seller_sales table for manager-recorded sales
-- =========================================

CREATE TABLE IF NOT EXISTS public.seller_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  seller_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_name text,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','CUP')),
  amount_to_receive numeric,
  is_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_sales ENABLE ROW LEVEL SECURITY;

-- Sellers can insert their own sales and view their own records
CREATE POLICY "Sellers insert own sales"
  ON public.seller_sales FOR INSERT
  WITH CHECK (seller_user_id = auth.uid());

CREATE POLICY "Sellers view own sales"
  ON public.seller_sales FOR SELECT
  USING (seller_user_id = auth.uid());

-- Admins and owners can manage all sales
CREATE POLICY "Admins manage seller sales"
  ON public.seller_sales FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_seller_sales_seller ON public.seller_sales(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_seller_sales_product ON public.seller_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_seller_sales_created ON public.seller_sales(created_at);

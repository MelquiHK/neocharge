-- =========================================
-- NeoCharge Extended Features Migration
-- =========================================

-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'mensajero';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cliente';

-- 2. Extend profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 3. Messenger Profiles (for rate tracking)
CREATE TABLE IF NOT EXISTS public.messenger_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rate_per_km NUMERIC(10,2) NOT NULL DEFAULT 300,
  vehicle_type TEXT DEFAULT 'car',
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messenger_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messengers can manage own profile" 
  ON public.messenger_profiles FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all messenger profiles" 
  ON public.messenger_profiles FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 4. Sale Points (for messengers to calculate from)
CREATE TABLE IF NOT EXISTS public.sale_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  lat NUMERIC(10,8) NOT NULL,
  lng NUMERIC(11,8) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sale_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sale points viewable by everyone" 
  ON public.sale_points FOR SELECT 
  USING (true);

CREATE POLICY "Admins manage sale points" 
  ON public.sale_points FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 5. Payment Requests (for Managers)
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'CUP',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment requests" 
  ON public.payment_requests FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all payment requests" 
  ON public.payment_requests FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 6. Trigger for profile update
CREATE TRIGGER update_messenger_profiles_updated_at 
  BEFORE UPDATE ON public.messenger_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at 
  BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

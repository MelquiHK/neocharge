-- Programa de referidos para gestores (LOTE D, mejora 9).
-- Cada gestor tiene un código único (ej. YUSI-4F2K); los clientes que entran
-- con ?ref=CODIGO quedan atribuidos y el pedido guarda ref_code en orders.

CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  seller_name text,
  seller_phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

-- Lectura pública solo de códigos activos: el checkout de invitados necesita
-- validar el ?ref= sin estar autenticado.
CREATE POLICY "Anyone can read active referral codes"
  ON public.referral_codes FOR SELECT
  USING (is_active = true);

-- Los admins ven/gestionan todo (incluye códigos inactivos).
CREATE POLICY "Admins manage referral codes"
  ON public.referral_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- C2-en-repo: security_invoker en vistas de socios
-- (ya aplicado por dashboard el 2026-10-07; esta migración lo deja
-- registrado en el repo para futuros entornos)
-- =========================================

ALTER VIEW public.partner_balances SET (security_invoker = true);
ALTER VIEW public.partner_directory SET (security_invoker = true);
ALTER VIEW public.partner_location_directory SET (security_invoker = true);

-- Soporte de pago en EUROS (orden de Mel, 2026-10-30):
-- tasa EUR/CUP de elTOQUE guardada junto a la USD en exchange_rates.
-- El código de la tienda y del bot funciona con o sin esta columna
-- (fallback: site_settings clave 'eur_rate' y tasa-usd.json), pero para
-- que la tasa EUR viva en la misma tabla hay que aplicar este SQL una
-- sola vez en el SQL Editor del dashboard de Supabase.
ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS eur_to_cup numeric;

COMMENT ON COLUMN public.exchange_rates.eur_to_cup IS
  'Tasa EUR/CUP de elTOQUE del día (sin extra). NULL = EUR no registrado ese día.';

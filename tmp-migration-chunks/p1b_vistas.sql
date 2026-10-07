-- Vista: saldo por recoger en cada socio (holds − pickups + adjustments).
-- El RLS de las tablas base la hace efectiva solo para admin/owner.
CREATE OR REPLACE VIEW public.partner_balances AS
SELECT
  p.id AS partner_id,
  p.name AS partner_name,
  COALESCE(SUM(CASE WHEN l.kind = 'hold' THEN l.amount_usd ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN l.kind = 'pickup' THEN l.amount_usd ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN l.kind = 'adjustment' THEN l.amount_usd ELSE 0 END), 0)
    AS balance_usd
FROM public.partners p
LEFT JOIN public.partner_ledger l ON l.partner_id = p.id
GROUP BY p.id, p.name;

GRANT SELECT ON public.partner_balances TO authenticated;

-- ---------- Ventas: de dónde salió cada venta ----------
ALTER TABLE public.seller_sales
  ADD COLUMN IF NOT EXISTS source_type text CHECK (source_type IN ('own', 'partner')),
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_location_id uuid REFERENCES public.partner_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_price numeric,
  ADD COLUMN IF NOT EXISTS margin_held_usd numeric;
-- location_name (ya existe) sigue guardando el nombre del lugar legible.

CREATE INDEX IF NOT EXISTS idx_seller_sales_partner
  ON public.seller_sales(partner_id, created_at);

-- =========================================
-- Vistas de directorio (sin teléfonos ni notas internas).
-- Efectivas para admin/owner por el RLS de las tablas base.
-- Los gestores NO las usan: van por get_partner_sale_sources().
-- =========================================
CREATE OR REPLACE VIEW public.partner_directory AS
SELECT id, name, contact_name, is_active
FROM public.partners;

CREATE OR REPLACE VIEW public.partner_location_directory AS
SELECT
  pl.id, pl.partner_id, p.name AS partner_name,
  pl.name, pl.address, pl.area, pl.attendant_name,
  pl.latitude, pl.longitude, pl.map_link, pl.hours,
  pl.pickup_enabled, pl.delivery_enabled,
  pl.is_active, pl.sort_order
FROM public.partner_locations pl
JOIN public.partners p ON p.id = pl.partner_id;

GRANT SELECT ON public.partner_directory TO authenticated;
GRANT SELECT ON public.partner_location_directory TO authenticated;


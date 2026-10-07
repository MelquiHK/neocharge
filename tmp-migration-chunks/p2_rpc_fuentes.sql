-- =========================================
-- Función: fuentes de surtido para vender (gestores)
-- SECURITY DEFINER: es el único camino de lectura para no-admin.
-- Devuelve solo columnas seguras (sin teléfonos, notas ni costos
-- sensibles más allá del precio necesario para calcular el margen).
-- Solo roles: admin, owner, gestor.
-- =========================================
CREATE OR REPLACE FUNCTION public.get_partner_sale_sources(p_product_id uuid)
RETURNS TABLE (
  partner_id uuid,
  partner_name text,
  partner_price numeric,
  partner_currency text,
  location_id uuid,
  location_name text,
  location_address text,
  attendant_name text,
  quantity integer,
  pickup_enabled boolean,
  delivery_enabled boolean,
  priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'Sin permiso para ver fuentes de surtido';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    pp.partner_price,
    pp.partner_currency,
    pl.id,
    pl.name,
    pl.address,
    pl.attendant_name,
    COALESCE(s.quantity, 0),
    pl.pickup_enabled,
    pl.delivery_enabled,
    pp.priority
  FROM public.product_partners pp
  JOIN public.partners p
    ON p.id = pp.partner_id AND p.is_active
  JOIN public.partner_locations pl
    ON pl.partner_id = p.id AND pl.is_active
  LEFT JOIN public.partner_location_stock s
    ON s.product_id = pp.product_id
   AND s.partner_location_id = pl.id
  WHERE pp.product_id = p_product_id
    AND pp.is_active
  ORDER BY pp.priority DESC, p.name ASC, pl.sort_order ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_sale_sources(uuid) TO authenticated;

-- =========================================

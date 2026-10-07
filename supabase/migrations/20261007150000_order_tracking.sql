-- =============================================================
-- Tracking público de pedidos (2026-10-07) — MEJORA 2
-- =============================================================
-- PENDIENTE DE APLICAR EN VIVO (no aplicar sin revisión de Mel).
--
-- Problema: la policy "Users view own orders" de public.orders solo deja
-- leer a usuarios autenticados (auth.uid() = user_id). Un invitado (anon)
-- que compra sin cuenta no puede leer su propio pedido para ver el estado.
-- Una policy SELECT por teléfono no es posible: anon no tiene JWT con el
-- teléfono y exponer customer_phone en una policy sería filtrable.
--
-- Solución: dos funciones SECURITY DEFINER que solo devuelven los campos
-- necesarios para la confirmación y el rastreo. NUNCA exponen: user_id,
-- customer_phone, customer_address, latitude/longitude, location_link,
-- admin_notes ni pickup_location_id.
-- =============================================================

-- Columnas públicas de un pedido (las que ven /pedido-confirmado y /rastrear).
-- Se repite la lista en ambas funciones para no crear un tipo compuesto nuevo.

-- 1) Un pedido por id (página de confirmación tras el checkout).
CREATE OR REPLACE FUNCTION public.get_order_public(p_order_id uuid)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  status public.order_status,
  total numeric,
  total_cup numeric,
  payment_currency text,
  items jsonb,
  customer_name text,
  delivery_method text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.created_at,
    o.status,
    o.total,
    o.total_cup,
    o.payment_currency,
    o.items,
    o.customer_name,
    o.delivery_method::text
  FROM public.orders o
  WHERE o.id = p_order_id;
END;
$$;

-- 2) Pedidos por teléfono normalizado (página /rastrear).
-- El teléfono debe venir en formato 53XXXXXXXX (lo valida normalizeCubanPhone()
-- en el frontend); la función lo re-valida y no devuelve nada si es inválido.
CREATE OR REPLACE FUNCTION public.track_orders_by_phone(p_phone text)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  status public.order_status,
  total numeric,
  total_cup numeric,
  payment_currency text,
  items jsonb,
  customer_name text,
  delivery_method text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^535\d{7}$' THEN
    RETURN; -- teléfono inválido: no se devuelve ningún pedido
  END IF;
  RETURN QUERY
  SELECT
    o.id,
    o.created_at,
    o.status,
    o.total,
    o.total_cup,
    o.payment_currency,
    o.items,
    o.customer_name,
    o.delivery_method::text
  FROM public.orders o
  WHERE o.customer_phone = p_phone
  ORDER BY o.created_at DESC;
END;
$$;

-- Solo anon y authenticated pueden ejecutarlas (defensa en profundidad:
-- se revocan primero por si el default de la BD las dejara públicas).
REVOKE ALL ON FUNCTION public.get_order_public(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.track_orders_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_orders_by_phone(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_order_public(uuid) IS
  'Pedido público por id para /pedido-confirmado. SECURITY DEFINER: anon no tiene SELECT en orders por RLS.';
COMMENT ON FUNCTION public.track_orders_by_phone(text) IS
  'Pedidos de un teléfono normalizado (53XXXXXXXX) para /rastrear. SECURITY DEFINER: anon no tiene SELECT en orders por RLS.';

-- =============================================================
-- Alta de mensajeros SIN service_role fuera de Supabase — 2026-11-17
-- =============================================================
-- Contexto: la vía anterior (api/create-messenger.js en Vercel con
-- SUPABASE_SERVICE_ROLE_KEY) quedó descartada: la llave real nunca
-- sale del Secure Vault (dynamic_credentials solo entrega el
-- surrogate hsurr:*, que Sentinel sustituye únicamente en la salida
-- de ESTA VM hacia *.supabase.co; en Vercel el surrogate es una
-- cadena muerta y Supabase la rechaza → el endpoint daba 403).
--
-- Diseño nuevo (todo dentro de Supabase, con el JWT de Mel):
--   1. El mensajero crea su cuenta ÉL MISMO en la app NeoCharge
--      Mensajero (signUp con su correo y su contraseña).
--   2. Mel lo ACTIVA desde su panel con admin_set_messenger():
--      función SECURITY DEFINER que comprueba has_role del llamante
--      (admin/owner) y hace los inserts/updates en profiles,
--      user_roles y messenger_profiles. Necesaria porque las
--      policies de messenger_profiles NO dejan a un admin escribir
--      filas de otros (solo SELECT): sin esta función el panel no
--      puede activar a nadie con su propio JWT.
--   3. admin_list_messenger_candidates(): lista las cuentas
--      registradas (auth.users + profiles + estado de mensajero)
--      para que el panel muestre a quién falta por activar. Los
--      correos solo se exponen tras la misma comprobación de rol.
--   4. Policy de gestión total para admins en messenger_profiles
--      (respaldo directo por REST, mismo criterio que sale_points).
--
-- ESTADO: archivo listo; su aplicación requiere el SQL Editor de
-- Supabase (desde esta VM no hay ruta de DDL: PostgREST no ejecuta
-- DDL, pg-meta no está expuesto y no hay token de Management API).
-- =============================================================

CREATE OR REPLACE FUNCTION public.admin_set_messenger(
  p_user_id UUID,
  p_active BOOLEAN,
  p_vehicle TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_email TEXT;
  v_row public.messenger_profiles;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Solo un administrador puede hacer esto';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Falta el usuario';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Ese usuario no existe';
  END IF;

  -- Perfil público: el trigger de registro ya lo crea con el
  -- nombre/teléfono de los metadatos; aquí solo se completa lo que
  -- venga informado (nunca se borra lo que ya haya). OJO: profiles
  -- NO tiene columna email (comprobado en producción 2026-11-17).
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    p_user_id,
    NULLIF(trim(COALESCE(p_full_name, '')), ''),
    NULLIF(trim(COALESCE(p_phone, '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(NULLIF(trim(COALESCE(p_full_name, '')), ''), public.profiles.full_name),
    phone = COALESCE(NULLIF(trim(COALESCE(p_phone, '')), ''), public.profiles.phone);

  -- Rol «mensajero» (solo al activar; al desactivar se conserva:
  -- la puerta de la app es messenger_profiles.is_active).
  IF p_active THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'mensajero')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO public.messenger_profiles (user_id, is_active, vehicle_type)
  VALUES (p_user_id, p_active, COALESCE(NULLIF(p_vehicle, ''), 'motorcycle'))
  ON CONFLICT (user_id) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    vehicle_type = COALESCE(NULLIF(p_vehicle, ''), public.messenger_profiles.vehicle_type)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'user_id', v_row.user_id,
    'is_active', v_row.is_active,
    'vehicle_type', v_row.vehicle_type
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_messenger(UUID, BOOLEAN, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_messenger(UUID, BOOLEAN, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.admin_set_messenger(UUID, BOOLEAN, TEXT, TEXT, TEXT) IS
  'Activa/desactiva un mensajero (profiles + user_roles + messenger_profiles). Solo admin/owner. Alta de mensajeros 2026-11-17, sin service_role fuera de Supabase.';

CREATE OR REPLACE FUNCTION public.admin_list_messenger_candidates()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  roles TEXT[],
  is_messenger BOOLEAN,
  is_active BOOLEAN,
  vehicle_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Solo un administrador puede hacer esto';
  END IF;
  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    p.full_name,
    p.phone,
    u.created_at,
    COALESCE(
      (SELECT array_agg(r.role::TEXT) FROM public.user_roles r WHERE r.user_id = u.id),
      ARRAY[]::TEXT[]
    ),
    (mp.user_id IS NOT NULL),
    COALESCE(mp.is_active, false),
    mp.vehicle_type
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.messenger_profiles mp ON mp.user_id = u.id
  ORDER BY (mp.user_id IS NOT NULL) DESC, u.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_messenger_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_messenger_candidates() TO authenticated;

COMMENT ON FUNCTION public.admin_list_messenger_candidates() IS
  'Cuentas registradas con su estado de mensajero, para el panel de Mel. Solo admin/owner.';

-- Respaldo: gestión directa por REST para admins (mismo criterio que
-- «Admins manage sale points»). La vía principal del panel es la RPC.
DROP POLICY IF EXISTS "Admins manage all messenger profiles" ON public.messenger_profiles;
CREATE POLICY "Admins manage all messenger profiles"
  ON public.messenger_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

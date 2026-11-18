-- =============================================================
-- Seguimiento en vivo de entregas — FASES 2 y 3 (2026-11-18)
-- App de Mensajeros NeoCharge.
-- =============================================================
-- ESTADO: SIN APLICAR. Se aplica a mano en el SQL Editor de
-- Supabase (proyecto txkgchetianfvypnkziq), igual que la Fase 1
-- (20261117_seguimiento_en_vivo.sql, que debe estar aplicada
-- antes: esta migración se apoya en delivery_tracking,
-- messenger_locations, apply_messenger_ping, touch_updated_at,
-- has_role, profiles y messenger_profiles).
--
-- Todo es ADITIVO e idempotente: columnas con IF NOT EXISTS,
-- tablas con IF NOT EXISTS, funciones con CREATE OR REPLACE
-- (salvo las que cambian de firma o de columnas de salida, que
-- llevan su DROP IF EXISTS justo antes) y policies con
-- DROP POLICY IF EXISTS + CREATE POLICY. No toca precios,
-- tasas ni productos.
--
-- Qué trae cada fase:
--   FASE 2: foto de entrega (columna + bucket privado), memoria
--           de direcciones (la app aprende el pin de cada
--           dirección cuando una entrega termina bien) y paso
--           automático a «cerca» a menos de 300 m del destino.
--   FASE 3: factor de tiempo aprendido por zona (eta_factor en
--           el seguimiento del cliente), caducidad del token
--           30 min después de entregar/cancelar, resumen y
--           cierre del día del mensajero, y panel admin:
--           mensajeros en vivo, sugerencia de mensajero,
--           reasignación, historial del día y limpieza de
--           pings viejos.
-- =============================================================

-- ---------------------------------------------------------------
-- 1) Columnas nuevas en delivery_tracking.
--    delivery_photo_url: foto que el mensajero sube al entregar
--      (ruta dentro del bucket privado 'delivery-photos').
--    near_at: cuándo la entrega pasó a «cerca» por primera vez.
--    route_km / route_min: distancia y minutos de la ruta
--      tienda → destino según OSRM; la app los rellena al salir
--      (el mensajero puede actualizar su propia fila por la
--      policy «Messenger updates own tracking» de la Fase 1) y
--      sirven pa aprender los tiempos reales por zona (sección 7).
-- ---------------------------------------------------------------
ALTER TABLE public.delivery_tracking
  ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS near_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS route_km NUMERIC,
  ADD COLUMN IF NOT EXISTS route_min NUMERIC;

COMMENT ON COLUMN public.delivery_tracking.delivery_photo_url IS
  'Fase 2 mensajeros: foto de la entrega terminada (ruta en el bucket privado delivery-photos).';
COMMENT ON COLUMN public.delivery_tracking.near_at IS
  'Fase 2 mensajeros: momento en que la entrega entró a menos de 300 m del destino.';
COMMENT ON COLUMN public.delivery_tracking.route_km IS
  'Fase 2/3 mensajeros: km de la ruta tienda→destino (OSRM) al salir; base pa aprender tiempos.';
COMMENT ON COLUMN public.delivery_tracking.route_min IS
  'Fase 2/3 mensajeros: minutos estimados de la ruta (OSRM) al salir; base pa aprender tiempos.';

-- Índice pa las consultas por día de las secciones 8 y 9.
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_status_delivered
  ON public.delivery_tracking(status, delivered_at);

-- ---------------------------------------------------------------
-- 2) Utilidades de texto y distancia.
-- ---------------------------------------------------------------

-- 2a) normalize_address: deja una dirección comparable: minúsculas,
--     sin acentos, sin los signos .,;#«»"'() (pasan a espacio),
--     espacios colapsados y sin espacios en los bordes.
--     Es la LLAVE de la memoria de direcciones: dos escritos de la
--     misma dirección deben dar la misma llave. IMMUTABLE porque
--     solo depende del texto que entra.
CREATE OR REPLACE FUNCTION public.normalize_address(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT CASE
    WHEN p_text IS NULL THEN NULL
    ELSE NULLIF(
      trim(regexp_replace(
        translate(lower(p_text),
                  'áéíóúüñ.,;#«»"''()',
                  'aeiouun' || repeat(' ', 10)),
        '\s+', ' ', 'g')),
      '')
  END;
$$;

COMMENT ON FUNCTION public.normalize_address(TEXT) IS
  'Fase 2 mensajeros: normaliza una dirección (minúsculas, sin acentos ni signos, espacios colapsados). Llave de delivery_address_memory y de las zonas.';

-- OJO con las zonas (secciones 7 y 9): la zona de un pedido es el
-- último tramo de su dirección tras la última coma, normalizado.
-- Como normalize_address QUITA las comas, el corte se hace sobre
-- la dirección ORIGINAL y después se normaliza el tramo:
--   public.normalize_address(
--     (string_to_array(o.customer_address, ','))[
--       array_length(string_to_array(o.customer_address, ','), 1)])
-- Si no hay coma, el tramo es la dirección entera.

-- 2b) haversine_m: distancia en metros entre dos puntos GPS.
--     Utilidad interna pa no repetir la fórmula en el trigger
--     de pings y en la sugerencia de mensajero. Devuelve NULL
--     si falta algún punto.
CREATE OR REPLACE FUNCTION public.haversine_m(
  p_lat1 DOUBLE PRECISION, p_lng1 DOUBLE PRECISION,
  p_lat2 DOUBLE PRECISION, p_lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT CASE
    WHEN p_lat1 IS NULL OR p_lng1 IS NULL
      OR p_lat2 IS NULL OR p_lng2 IS NULL THEN NULL
    ELSE 6371000.0 * 2.0 * asin(LEAST(1.0, sqrt(
      power(sin((radians(p_lat2) - radians(p_lat1)) / 2.0), 2)
      + cos(radians(p_lat1)) * cos(radians(p_lat2))
        * power(sin((radians(p_lng2) - radians(p_lng1)) / 2.0), 2)
    )))
  END;
$$;

COMMENT ON FUNCTION public.haversine_m(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) IS
  'Fase 2 mensajeros: distancia haversine en metros entre dos puntos GPS; NULL si falta un punto.';

-- ---------------------------------------------------------------
-- 3) Memoria de direcciones: cada entrega terminada guarda el
--    pin real donde se entregó, ligado a la dirección escrita
--    por el cliente. Así, la próxima vez que llegue un pedido
--    con esa misma dirección (aunque el cliente no mande pin),
--    ya se sabe dónde es y se puede calcular la distancia.
--    Se escribe SOLO desde finish_delivery (RPC SECURITY
--    DEFINER): no hay policy de escritura directa pa
--    mensajeros; los admins sí tienen FOR ALL.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_address_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_key TEXT NOT NULL UNIQUE,  -- normalize_address(customer_address)
  address_text TEXT,                 -- dirección tal como la escribió el cliente
  customer_phone TEXT,
  lat DOUBLE PRECISION NOT NULL,     -- pin real de la entrega
  lng DOUBLE PRECISION NOT NULL,
  times_used INT NOT NULL DEFAULT 1, -- cuántas entregas confirman este pin
  last_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  last_messenger_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- El UNIQUE de address_key ya crea su índice; este es explícito
-- por claridad (IF NOT EXISTS: si el del UNIQUE ya cubre, el
-- aplicador puede saltarse esta línea sin romper nada).
CREATE INDEX IF NOT EXISTS idx_delivery_address_memory_key
  ON public.delivery_address_memory(address_key);

DROP TRIGGER IF EXISTS trg_delivery_address_memory_touch ON public.delivery_address_memory;
CREATE TRIGGER trg_delivery_address_memory_touch
  BEFORE UPDATE ON public.delivery_address_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

COMMENT ON TABLE public.delivery_address_memory IS
  'Fase 2 mensajeros: pin aprendido por dirección normalizada. Se alimenta solo desde finish_delivery.';

ALTER TABLE public.delivery_address_memory ENABLE ROW LEVEL SECURITY;

-- Lectura: mensajeros ACTIVOS (la app la usa pa resolver destinos
-- sin pin) y admins/owner.
DROP POLICY IF EXISTS "Active messengers and admins view address memory" ON public.delivery_address_memory;
CREATE POLICY "Active messengers and admins view address memory"
  ON public.delivery_address_memory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messenger_profiles mp
      WHERE mp.user_id = auth.uid() AND mp.is_active
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

-- Admins: todo (correcciones a mano desde el panel/SQL).
DROP POLICY IF EXISTS "Admins manage address memory" ON public.delivery_address_memory;
CREATE POLICY "Admins manage address memory"
  ON public.delivery_address_memory FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- ---------------------------------------------------------------
-- 4) Bucket privado de fotos de entrega.
--    Convención de ruta: delivery-photos/<order_id>/<archivo>
--    El primer segmento de la ruta es el id del pedido: las
--    policies atan la foto a la entrega de ese pedido.
-- ---------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-photos', 'delivery-photos', false)
ON CONFLICT (id) DO NOTHING;

-- (a) El mensajero SUBE solo fotos de un pedido asignado a él
--     con la entrega activa (salio / en_camino / cerca).
DROP POLICY IF EXISTS "Messengers upload delivery photos" ON storage.objects;
CREATE POLICY "Messengers upload delivery photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-photos'
    AND EXISTS (
      SELECT 1 FROM public.delivery_tracking t
      WHERE t.order_id::TEXT = (storage.foldername(name))[1]
        AND t.messenger_id = auth.uid()
        AND t.status IN ('salio', 'en_camino', 'cerca')
    )
  );

-- (b) El mensajero LEE las fotos de los pedidos que son o fueron
--     suyos (mismo criterio de ruta: pedido asignado a él).
DROP POLICY IF EXISTS "Messengers view own delivery photos" ON storage.objects;
CREATE POLICY "Messengers view own delivery photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'delivery-photos'
    AND EXISTS (
      SELECT 1 FROM public.delivery_tracking t
      WHERE t.order_id::TEXT = (storage.foldername(name))[1]
        AND t.messenger_id = auth.uid()
    )
  );

-- (c) Admins/owner leen todas las fotos (panel e historial).
DROP POLICY IF EXISTS "Admins view all delivery photos" ON storage.objects;
CREATE POLICY "Admins view all delivery photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'delivery-photos'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  );

-- ---------------------------------------------------------------
-- 5) finish_delivery v2: misma firma de entrada principal, pero
--    acepta la foto y el pin final, y ALIMENTA la memoria de
--    direcciones. Se borra la v1 (finish_delivery(UUID)) porque
--    la firma cambia: si quedaran las dos, PostgREST no sabría
--    cuál llamar con solo el order_id.
--    Pin que se aprende: el que manda la app (p_lat/p_lng) si
--    viene; si no, la última posición conocida del tracking.
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.finish_delivery(UUID);

CREATE OR REPLACE FUNCTION public.finish_delivery(
  p_order_id UUID,
  p_photo_url TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS public.delivery_tracking
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_row public.delivery_tracking;
  v_address TEXT;
  v_phone TEXT;
  v_pin_lat DOUBLE PRECISION;
  v_pin_lng DOUBLE PRECISION;
  v_key TEXT;
BEGIN
  UPDATE public.delivery_tracking
  SET status = 'entregado',
      delivered_at = now(),
      delivery_photo_url = COALESCE(p_photo_url, delivery_photo_url)
  WHERE order_id = p_order_id
    AND messenger_id = auth.uid()
    AND status IN ('salio', 'en_camino', 'cerca')
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'No hay una entrega activa tuya para este pedido';
  END IF;

  UPDATE public.orders SET status = 'delivered'
  WHERE id = p_order_id AND status <> 'delivered';

  -- Memoria de direcciones: solo si hay pin y dirección escrita.
  v_pin_lat := COALESCE(p_lat, v_row.last_lat);
  v_pin_lng := COALESCE(p_lng, v_row.last_lng);
  IF v_pin_lat IS NOT NULL AND v_pin_lng IS NOT NULL THEN
    SELECT o.customer_address, o.customer_phone
    INTO v_address, v_phone
    FROM public.orders o WHERE o.id = p_order_id;
    IF v_address IS NOT NULL AND trim(v_address) <> '' THEN
      v_key := public.normalize_address(v_address);
      IF v_key IS NOT NULL AND v_key <> '' THEN
        INSERT INTO public.delivery_address_memory (
          address_key, address_text, customer_phone, lat, lng,
          times_used, last_order_id, last_messenger_id
        ) VALUES (
          v_key, v_address, v_phone, v_pin_lat, v_pin_lng,
          1, p_order_id, auth.uid()
        )
        ON CONFLICT (address_key) DO UPDATE
          SET lat = EXCLUDED.lat,
              lng = EXCLUDED.lng,
              address_text = EXCLUDED.address_text,
              customer_phone = COALESCE(EXCLUDED.customer_phone,
                                        delivery_address_memory.customer_phone),
              times_used = delivery_address_memory.times_used + 1,
              last_order_id = EXCLUDED.last_order_id,
              last_messenger_id = EXCLUDED.last_messenger_id,
              updated_at = now();
      END IF;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.finish_delivery(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) IS
  'Fase 2 mensajeros: «Llegué» con foto y pin final; cierra el pedido y alimenta delivery_address_memory.';

-- ---------------------------------------------------------------
-- 6) Trigger de pings v2: además de actualizar el snapshot y
--    pasar salio → en_camino (como en la Fase 1), calcula la
--    distancia al destino y pasa a «cerca» a 300 m o menos.
--    Destino: el pin del pedido (orders.latitude/longitude);
--    si el pedido no trae pin, el pin aprendido en la memoria
--    de direcciones pa esa dirección escrita.
--    near_at se pone solo la primera vez.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_messenger_ping()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_ord_lat NUMERIC;
  v_ord_lng NUMERIC;
  v_ord_address TEXT;
  v_dest_lat DOUBLE PRECISION;
  v_dest_lng DOUBLE PRECISION;
  v_dist_m DOUBLE PRECISION;
BEGIN
  SELECT o.latitude, o.longitude, o.customer_address
  INTO v_ord_lat, v_ord_lng, v_ord_address
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  IF v_ord_lat IS NOT NULL AND v_ord_lng IS NOT NULL THEN
    v_dest_lat := v_ord_lat::DOUBLE PRECISION;
    v_dest_lng := v_ord_lng::DOUBLE PRECISION;
  ELSIF v_ord_address IS NOT NULL AND trim(v_ord_address) <> '' THEN
    SELECT m.lat, m.lng INTO v_dest_lat, v_dest_lng
    FROM public.delivery_address_memory m
    WHERE m.address_key = public.normalize_address(v_ord_address);
  END IF;

  v_dist_m := public.haversine_m(NEW.lat, NEW.lng, v_dest_lat, v_dest_lng);

  UPDATE public.delivery_tracking t
  SET last_lat = NEW.lat,
      last_lng = NEW.lng,
      last_speed_kmh = NEW.speed_kmh,
      last_seen_at = NEW.recorded_at,
      status = CASE
        WHEN t.status = 'salio' AND v_dist_m IS NOT NULL AND v_dist_m <= 300 THEN 'cerca'
        WHEN t.status = 'salio' THEN 'en_camino'
        WHEN t.status = 'en_camino' AND v_dist_m IS NOT NULL AND v_dist_m <= 300 THEN 'cerca'
        ELSE t.status
      END,
      near_at = CASE
        WHEN t.status IN ('salio', 'en_camino')
         AND v_dist_m IS NOT NULL AND v_dist_m <= 300
        THEN COALESCE(t.near_at, now())
        ELSE t.near_at
      END
  WHERE t.id = NEW.tracking_id
    AND (t.last_seen_at IS NULL OR NEW.recorded_at >= t.last_seen_at);
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------
-- 7) get_live_tracking v2: mismas columnas de la Fase 1 MÁS
--    eta_factor y eta_samples AL FINAL, y caducidad del token.
--    Como cambian las columnas de salida, CREATE OR REPLACE no
--    basta: hay que borrar la función antes de crearla.
--
--    eta_factor: cuánto tardan de verdad las entregas de la
--    ZONA de este pedido comparadas con lo que decía OSRM
--    (route_min). factor = promedio de
--    (minutos reales / route_min) en entregas ya entregadas de
--    la misma zona con route_min > 0, limitado entre 0.7 y 2.0.
--    Con menos de 3 muestras no se inventa nada: factor 1.
--    La app/cliente multiplica su ETA por este factor.
--
--    Caducidad: si la entrega ya terminó (entregado/cancelado)
--    hace más de 30 minutos, el token no devuelve nada. Los
--    30 min de gracia dejan ver la pantalla de «entregado».
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_live_tracking(TEXT);

CREATE OR REPLACE FUNCTION public.get_live_tracking(p_token TEXT)
RETURNS TABLE (
  order_id UUID,
  order_status public.order_status,
  delivery_status TEXT,
  customer_name TEXT,
  delivery_address TEXT,
  dest_lat DOUBLE PRECISION,
  dest_lng DOUBLE PRECISION,
  messenger_name TEXT,
  messenger_photo TEXT,
  messenger_phone TEXT,
  messenger_lat DOUBLE PRECISION,
  messenger_lng DOUBLE PRECISION,
  speed_kmh NUMERIC,
  last_seen_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_fee NUMERIC,
  total_cup NUMERIC,
  items JSONB,
  eta_factor NUMERIC,
  eta_samples INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_order_id UUID;
  v_zone TEXT;
  v_samples INT := 0;
  v_avg NUMERIC;
  v_factor NUMERIC := 1;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN; -- token inválido: no se devuelve nada
  END IF;

  -- Pedido y zona de ESTE token (zona = último tramo tras la
  -- última coma, normalizado; ver la nota de la sección 2).
  SELECT o.id,
         public.normalize_address(
           (string_to_array(o.customer_address, ','))[
             array_length(string_to_array(o.customer_address, ','), 1)])
  INTO v_order_id, v_zone
  FROM public.delivery_tracking t
  JOIN public.orders o ON o.id = t.order_id
  WHERE t.tracking_token = p_token;

  IF v_order_id IS NULL THEN
    RETURN; -- token desconocido
  END IF;

  -- Factor aprendido de la zona con entregas pasadas.
  IF v_zone IS NOT NULL AND v_zone <> '' THEN
    SELECT COUNT(*)::INT,
           AVG((extract(epoch FROM (t2.delivered_at - t2.started_at)) / 60.0)
               / NULLIF(t2.route_min, 0))
    INTO v_samples, v_avg
    FROM public.delivery_tracking t2
    JOIN public.orders o2 ON o2.id = t2.order_id
    WHERE t2.status = 'entregado'
      AND t2.route_min > 0
      AND t2.started_at IS NOT NULL
      AND t2.delivered_at IS NOT NULL
      AND t2.order_id <> v_order_id
      AND public.normalize_address(
            (string_to_array(o2.customer_address, ','))[
              array_length(string_to_array(o2.customer_address, ','), 1)]) = v_zone;
    IF v_samples >= 3 AND v_avg IS NOT NULL THEN
      v_factor := LEAST(2.0, GREATEST(0.7, v_avg));
    ELSE
      v_factor := 1;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.status::public.order_status,
    t.status,
    o.customer_name,
    o.customer_address,
    o.latitude::DOUBLE PRECISION,
    o.longitude::DOUBLE PRECISION,
    p.full_name,
    p.avatar_url,
    CASE WHEN t.status IN ('salio', 'en_camino', 'cerca') THEN p.phone ELSE NULL END,
    t.last_lat,
    t.last_lng,
    t.last_speed_kmh,
    t.last_seen_at,
    t.started_at,
    t.delivered_at,
    o.delivery_fee,
    o.total_cup,
    o.items,
    v_factor,
    COALESCE(v_samples, 0)
  FROM public.delivery_tracking t
  JOIN public.orders o ON o.id = t.order_id
  LEFT JOIN public.profiles p ON p.id = t.messenger_id
  WHERE t.tracking_token = p_token
    AND NOT (
      t.status IN ('entregado', 'cancelado')
      AND COALESCE(t.delivered_at, t.updated_at) < now() - interval '30 minutes'
    );
END;
$$;

COMMENT ON FUNCTION public.get_live_tracking(TEXT) IS
  'Fases 1-3 mensajeros: seguimiento SIN login por token; añade eta_factor/eta_samples por zona y caducidad del token 30 min tras entregar/cancelar.';

-- ---------------------------------------------------------------
-- 8) Día del mensajero: resumen y cierre.
--    El «día» es el día de La Habana (America/Havana) según el
--    delivered_at de cada entrega. El cierre guarda la foto del
--    día en delivery_day_closures: cuánto entregó, cuánto tiene
--    que entregar de mensajería (delivery_fee) y cuánto valían
--    los pedidos. La escritura es solo por la RPC close_my_day.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_day_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  deliveries INT NOT NULL DEFAULT 0,
  to_collect_cup NUMERIC NOT NULL DEFAULT 0,  -- suma de orders.delivery_fee
  orders_value_cup NUMERIC NOT NULL DEFAULT 0, -- suma de orders.total_cup
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (messenger_id, day)
);

COMMENT ON TABLE public.delivery_day_closures IS
  'Fase 3 mensajeros: cierre del día por mensajero (día de La Habana). Se escribe solo desde close_my_day.';

ALTER TABLE public.delivery_day_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messenger views own closures" ON public.delivery_day_closures;
CREATE POLICY "Messenger views own closures"
  ON public.delivery_day_closures FOR SELECT
  TO authenticated
  USING (messenger_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all closures" ON public.delivery_day_closures;
CREATE POLICY "Admins manage all closures"
  ON public.delivery_day_closures FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- 8a) Mi resumen de hoy: lo que la app muestra al mensajero.
CREATE OR REPLACE FUNCTION public.my_day_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'America/Havana')::date;
  v_deliveries INT := 0;
  v_collect NUMERIC := 0;
  v_value NUMERIC := 0;
  v_closure JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión';
  END IF;

  SELECT COUNT(*)::INT,
         COALESCE(SUM(o.delivery_fee), 0),
         COALESCE(SUM(o.total_cup), 0)
  INTO v_deliveries, v_collect, v_value
  FROM public.delivery_tracking t
  JOIN public.orders o ON o.id = t.order_id
  WHERE t.messenger_id = auth.uid()
    AND t.status = 'entregado'
    AND (t.delivered_at AT TIME ZONE 'America/Havana')::date = v_today;

  SELECT to_jsonb(c) INTO v_closure
  FROM public.delivery_day_closures c
  WHERE c.messenger_id = auth.uid() AND c.day = v_today;

  RETURN jsonb_build_object(
    'deliveries', v_deliveries,
    'to_collect_cup', v_collect,
    'orders_value_cup', v_value,
    'closed', v_closure IS NOT NULL,
    'closure', v_closure
  );
END;
$$;

COMMENT ON FUNCTION public.my_day_summary() IS
  'Fase 3 mensajeros: resumen del día (La Habana) del mensajero que llama: entregas, mensajería a entregar, valor de pedidos y si ya cerró.';

-- 8b) Cerrar mi día: calcula lo mismo que my_day_summary y lo
--     guarda (UPSERT por mensajero + día). Devuelve el resumen
--     ya con closed = true.
CREATE OR REPLACE FUNCTION public.close_my_day()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'America/Havana')::date;
  v_deliveries INT := 0;
  v_collect NUMERIC := 0;
  v_value NUMERIC := 0;
  v_closure JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión';
  END IF;

  SELECT COUNT(*)::INT,
         COALESCE(SUM(o.delivery_fee), 0),
         COALESCE(SUM(o.total_cup), 0)
  INTO v_deliveries, v_collect, v_value
  FROM public.delivery_tracking t
  JOIN public.orders o ON o.id = t.order_id
  WHERE t.messenger_id = auth.uid()
    AND t.status = 'entregado'
    AND (t.delivered_at AT TIME ZONE 'America/Havana')::date = v_today;

  INSERT INTO public.delivery_day_closures (
    messenger_id, day, deliveries, to_collect_cup, orders_value_cup
  ) VALUES (auth.uid(), v_today, v_deliveries, v_collect, v_value)
  ON CONFLICT (messenger_id, day) DO UPDATE
    SET deliveries = EXCLUDED.deliveries,
        to_collect_cup = EXCLUDED.to_collect_cup,
        orders_value_cup = EXCLUDED.orders_value_cup,
        closed_at = now();

  SELECT to_jsonb(c) INTO v_closure
  FROM public.delivery_day_closures c
  WHERE c.messenger_id = auth.uid() AND c.day = v_today;

  RETURN jsonb_build_object(
    'deliveries', v_deliveries,
    'to_collect_cup', v_collect,
    'orders_value_cup', v_value,
    'closed', true,
    'closure', v_closure
  );
END;
$$;

COMMENT ON FUNCTION public.close_my_day() IS
  'Fase 3 mensajeros: cierra el día del mensajero que llama y devuelve el resumen con closed=true.';

-- ---------------------------------------------------------------
-- 9) Panel admin (solo admin/owner; si no, RAISE).
-- ---------------------------------------------------------------

-- 9a) Mensajeros en vivo: última posición, entrega actual y
--     números de hoy de cada mensajero activo.
CREATE OR REPLACE FUNCTION public.admin_live_messengers()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  phone TEXT,
  vehicle_type TEXT,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  last_seen_at TIMESTAMPTZ,
  current_order_id UUID,
  current_order_number TEXT,
  current_status TEXT,
  active_count INT,
  delivered_today INT,
  fees_today_cup NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
#variable_conflict use_column
DECLARE
  v_today DATE := (now() AT TIME ZONE 'America/Havana')::date;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  RETURN QUERY
  SELECT
    mp.user_id,
    p.full_name,
    p.phone,
    mp.vehicle_type,
    cur.last_lat,
    cur.last_lng,
    cur.last_seen_at,
    cur.order_id,
    co.order_number::TEXT,
    cur.status,
    COALESCE(agg.active_count, 0),
    COALESCE(agg.delivered_today, 0),
    COALESCE(agg.fees_today_cup, 0)
  FROM public.messenger_profiles mp
  LEFT JOIN public.profiles p ON p.id = mp.user_id
  LEFT JOIN LATERAL (
    SELECT t.order_id, t.last_lat, t.last_lng, t.last_seen_at, t.status
    FROM public.delivery_tracking t
    WHERE t.messenger_id = mp.user_id
      AND t.status IN ('asignado', 'salio', 'en_camino', 'cerca')
    ORDER BY t.updated_at DESC
    LIMIT 1
  ) cur ON TRUE
  LEFT JOIN public.orders co ON co.id = cur.order_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) FILTER (WHERE t.status IN ('salio', 'en_camino', 'cerca'))::INT AS active_count,
      COUNT(*) FILTER (WHERE t.status = 'entregado'
        AND (t.delivered_at AT TIME ZONE 'America/Havana')::date = v_today)::INT AS delivered_today,
      COALESCE(SUM(o.delivery_fee) FILTER (WHERE t.status = 'entregado'
        AND (t.delivered_at AT TIME ZONE 'America/Havana')::date = v_today), 0) AS fees_today_cup
    FROM public.delivery_tracking t
    JOIN public.orders o ON o.id = t.order_id
    WHERE t.messenger_id = mp.user_id
  ) agg ON TRUE
  WHERE mp.is_active
  ORDER BY p.full_name NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.admin_live_messengers() IS
  'Fase 3 mensajeros (admin): mensajeros activos con última posición, entrega actual y números de hoy.';

-- 9b) Sugerencia de mensajero pa un pedido: ordena a los
--     mensajeros activos por score = distancia al destino
--     (km; 50 si no se conoce su posición, y esos van al final)
--     + 5 por cada entrega activa que ya lleva.
--     Destino: pin del pedido o, si no tiene, pin de memoria.
--     Posición del mensajero: la última conocida entre sus
--     snapshots de tracking y sus pings.
CREATE OR REPLACE FUNCTION public.admin_suggest_messenger(p_order_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  vehicle_type TEXT,
  distance_km NUMERIC,
  active_count INT,
  delivered_today INT,
  score NUMERIC,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
#variable_conflict use_column
DECLARE
  v_today DATE := (now() AT TIME ZONE 'America/Havana')::date;
  v_o_lat NUMERIC;
  v_o_lng NUMERIC;
  v_o_address TEXT;
  v_dest_lat DOUBLE PRECISION;
  v_dest_lng DOUBLE PRECISION;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT o.latitude, o.longitude, o.customer_address
  INTO v_o_lat, v_o_lng, v_o_address
  FROM public.orders o WHERE o.id = p_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;

  IF v_o_lat IS NOT NULL AND v_o_lng IS NOT NULL THEN
    v_dest_lat := v_o_lat::DOUBLE PRECISION;
    v_dest_lng := v_o_lng::DOUBLE PRECISION;
  ELSIF v_o_address IS NOT NULL AND trim(v_o_address) <> '' THEN
    SELECT m.lat, m.lng INTO v_dest_lat, v_dest_lng
    FROM public.delivery_address_memory m
    WHERE m.address_key = public.normalize_address(v_o_address);
  END IF;

  RETURN QUERY
  SELECT
    s.uid,
    s.fname,
    s.vtype,
    s.distance_km,
    s.active_count,
    s.delivered_today,
    (COALESCE(s.distance_km, 50) + 5 * s.active_count)::NUMERIC,
    CASE
      WHEN v_dest_lat IS NULL THEN 'no se conoce el destino del pedido'
      WHEN s.distance_km IS NULL THEN 'no se conoce su posición'
      ELSE 'está a ' || ROUND(s.distance_km, 1)::TEXT || ' km'
    END
    || CASE
      WHEN s.active_count = 0 THEN ' y no lleva entregas ahora'
      WHEN s.active_count = 1 THEN ' y lleva 1 entrega activa'
      ELSE ' y lleva ' || s.active_count::TEXT || ' entregas activas'
    END
  FROM (
    SELECT
      mp.user_id AS uid,
      p.full_name AS fname,
      mp.vehicle_type AS vtype,
      CASE
        WHEN pos.lat IS NULL OR v_dest_lat IS NULL THEN NULL
        ELSE ROUND((public.haversine_m(pos.lat, pos.lng, v_dest_lat, v_dest_lng) / 1000.0)::NUMERIC, 3)
      END AS distance_km,
      COALESCE(cnt.active_count, 0) AS active_count,
      COALESCE(cnt.delivered_today, 0) AS delivered_today
    FROM public.messenger_profiles mp
    LEFT JOIN public.profiles p ON p.id = mp.user_id
    LEFT JOIN LATERAL (
      SELECT u.lat, u.lng
      FROM (
        SELECT t.last_lat AS lat, t.last_lng AS lng, t.last_seen_at AS ts
        FROM public.delivery_tracking t
        WHERE t.messenger_id = mp.user_id
          AND t.last_lat IS NOT NULL AND t.last_lng IS NOT NULL
        UNION ALL
        SELECT ml.lat AS lat, ml.lng AS lng, ml.recorded_at AS ts
        FROM public.messenger_locations ml
        WHERE ml.messenger_id = mp.user_id
      ) u
      ORDER BY u.ts DESC NULLS LAST
      LIMIT 1
    ) pos ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE t.status IN ('salio', 'en_camino', 'cerca'))::INT AS active_count,
        COUNT(*) FILTER (WHERE t.status = 'entregado'
          AND (t.delivered_at AT TIME ZONE 'America/Havana')::date = v_today)::INT AS delivered_today
      FROM public.delivery_tracking t
      WHERE t.messenger_id = mp.user_id
    ) cnt ON TRUE
    WHERE mp.is_active
  ) s
  ORDER BY (s.distance_km IS NULL),
           (COALESCE(s.distance_km, 50) + 5 * s.active_count) ASC;
END;
$$;

COMMENT ON FUNCTION public.admin_suggest_messenger(UUID) IS
  'Fase 3 mensajeros (admin): mensajeros activos ordenados por cercanía al destino y carga actual, con el motivo en texto simple.';

-- 9c) Reasignar un pedido a otro mensajero. Si la entrega ya
--     salió (salio/en_camino/cerca) no se toca: RAISE con el
--     texto exacto que espera el panel. Si ya se entregó,
--     también RAISE. Si el tracking estaba cancelado, vuelve
--     a «asignado» con el mensajero nuevo.
CREATE OR REPLACE FUNCTION public.admin_reassign_order(
  p_order_id UUID,
  p_messenger_id UUID
)
RETURNS public.delivery_tracking
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_track public.delivery_tracking;
  v_row public.delivery_tracking;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id) THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.messenger_profiles mp
    WHERE mp.user_id = p_messenger_id AND mp.is_active
  ) THEN
    RAISE EXCEPTION 'El mensajero destino no está activo';
  END IF;

  SELECT * INTO v_track
  FROM public.delivery_tracking
  WHERE order_id = p_order_id;

  IF FOUND THEN
    IF v_track.status IN ('salio', 'en_camino', 'cerca') THEN
      RAISE EXCEPTION 'Ese pedido ya salió con otro mensajero';
    END IF;
    IF v_track.status = 'entregado' THEN
      RAISE EXCEPTION 'Ese pedido ya fue entregado';
    END IF;
    UPDATE public.orders SET messenger_id = p_messenger_id
    WHERE id = p_order_id;
    UPDATE public.delivery_tracking
    SET messenger_id = p_messenger_id,
        status = CASE WHEN status = 'cancelado' THEN 'asignado' ELSE status END
    WHERE order_id = p_order_id
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.orders SET messenger_id = p_messenger_id
    WHERE id = p_order_id;
    INSERT INTO public.delivery_tracking (order_id, messenger_id, status)
    VALUES (p_order_id, p_messenger_id, 'asignado')
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.admin_reassign_order(UUID, UUID) IS
  'Fase 3 mensajeros (admin): reasigna un pedido que aún no salió a otro mensajero activo.';

-- 9d) Historial de un día (por defecto hoy, La Habana):
--     por mensajero (entregas, promedio de minutos, dinero),
--     zonas con más pedidos CREADOS ese día (máx. 15) y fotos
--     de las entregas de ese día.
CREATE OR REPLACE FUNCTION public.admin_day_history(p_day DATE DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_day DATE := COALESCE(p_day, (now() AT TIME ZONE 'America/Havana')::date);
  v_messengers JSONB;
  v_zones JSONB;
  v_photos JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'user_id', s.uid,
             'full_name', s.fname,
             'delivered', s.delivered,
             'avg_minutes', s.avg_min,
             'fees_cup', s.fees,
             'orders_value_cup', s.val
           ) ORDER BY s.delivered DESC), '[]'::JSONB)
  INTO v_messengers
  FROM (
    SELECT t.messenger_id AS uid,
           p.full_name AS fname,
           COUNT(*)::INT AS delivered,
           ROUND(AVG(extract(epoch FROM (t.delivered_at - t.started_at)) / 60.0)::NUMERIC, 1) AS avg_min,
           COALESCE(SUM(o.delivery_fee), 0) AS fees,
           COALESCE(SUM(o.total_cup), 0) AS val
    FROM public.delivery_tracking t
    JOIN public.orders o ON o.id = t.order_id
    LEFT JOIN public.profiles p ON p.id = t.messenger_id
    WHERE t.status = 'entregado'
      AND (t.delivered_at AT TIME ZONE 'America/Havana')::date = v_day
    GROUP BY t.messenger_id, p.full_name
  ) s;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('zone', z.zone, 'orders', z.cnt)
           ORDER BY z.cnt DESC), '[]'::JSONB)
  INTO v_zones
  FROM (
    SELECT public.normalize_address(
             (string_to_array(o.customer_address, ','))[
               array_length(string_to_array(o.customer_address, ','), 1)]) AS zone,
           COUNT(*)::INT AS cnt
    FROM public.orders o
    WHERE (o.created_at AT TIME ZONE 'America/Havana')::date = v_day
      AND o.customer_address IS NOT NULL
      AND trim(o.customer_address) <> ''
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 15
  ) z;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object(
             'order_id', t.order_id,
             'order_number', o.order_number::TEXT,
             'photo_url', t.delivery_photo_url,
             'messenger_name', p.full_name
           ) ORDER BY t.delivered_at DESC), '[]'::JSONB)
  INTO v_photos
  FROM public.delivery_tracking t
  JOIN public.orders o ON o.id = t.order_id
  LEFT JOIN public.profiles p ON p.id = t.messenger_id
  WHERE t.status = 'entregado'
    AND t.delivery_photo_url IS NOT NULL
    AND (t.delivered_at AT TIME ZONE 'America/Havana')::date = v_day;

  RETURN jsonb_build_object(
    'day', v_day,
    'messengers', v_messengers,
    'zones', v_zones,
    'photos', v_photos
  );
END;
$$;

COMMENT ON FUNCTION public.admin_day_history(DATE) IS
  'Fase 3 mensajeros (admin): resumen de un día (La Habana): mensajeros, zonas y fotos de entrega.';

-- ---------------------------------------------------------------
-- 10) Limpieza de pings viejos: borra el historial de
--     posiciones de más de 30 días (el snapshot vive en
--     delivery_tracking, no se pierde la última posición).
--     Se llama desde el botón del panel admin, a mano.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_locations()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Solo administradores';
  END IF;
  DELETE FROM public.messenger_locations
  WHERE received_at < now() - interval '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_locations() IS
  'Fase 3 mensajeros (admin): borra pings de messenger_locations de más de 30 días y devuelve cuántos borró. Se llama desde el botón del panel.';

-- ---------------------------------------------------------------
-- 11) Grants de todo lo nuevo (mismo patrón de la Fase 1:
--     se revoca PUBLIC y se da solo a quien toca).
-- ---------------------------------------------------------------
REVOKE ALL ON FUNCTION public.normalize_address(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.haversine_m(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finish_delivery(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_live_tracking(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_day_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_my_day() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_live_messengers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_suggest_messenger(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reassign_order(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_day_history(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_locations() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_address(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haversine_m(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_delivery(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_tracking(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_day_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_my_day() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_live_messengers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suggest_messenger(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_order(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_day_history(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_locations() TO authenticated;

-- Tablas nuevas: lectura por RLS; la escritura va por las RPC
-- SECURITY DEFINER (el dueño de la función sí puede escribir).
GRANT SELECT ON public.delivery_address_memory TO authenticated;
GRANT SELECT ON public.delivery_day_closures TO authenticated;

-- =============================================================
-- 12) Verificación (correr a mano tras aplicar; todo comentado):
--
-- Columnas y tablas nuevas:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'delivery_tracking'
--     AND column_name IN ('delivery_photo_url', 'near_at', 'route_km', 'route_min');
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('delivery_address_memory', 'delivery_day_closures');
--   SELECT id, public FROM storage.buckets WHERE id = 'delivery-photos';
--
-- Funciones nuevas / cambiadas (finish_delivery debe salir UNA
-- sola vez, con 4 argumentos; get_live_tracking con eta_factor
-- y eta_samples al final de sus argumentos de salida):
--   SELECT proname, pg_get_function_identity_arguments(oid)
--   FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace
--     AND proname IN ('normalize_address', 'haversine_m',
--       'finish_delivery', 'get_live_tracking', 'my_day_summary',
--       'close_my_day', 'admin_live_messengers',
--       'admin_suggest_messenger', 'admin_reassign_order',
--       'admin_day_history', 'cleanup_old_locations');
--
-- Pruebas rápidas:
--   SELECT public.normalize_address('Calle 23, #456; «Vedado».');
--     -- debe dar: calle 23 456 vedado
--   SELECT public.haversine_m(23.1136, -82.3666, 23.1136, -82.3666);
--     -- debe dar 0
--   SELECT * FROM public.admin_live_messengers();        -- como admin
--   SELECT * FROM public.admin_suggest_messenger('<order_id>');
--   SELECT public.admin_day_history();
--   SELECT public.my_day_summary();                      -- como mensajero
--   SELECT public.get_live_tracking('<token de una entrega entregada hace >30 min>');
--     -- no debe devolver filas (token caducado)
-- =============================================================
-- FIN FASES 2 y 3. Pendiente tras aplicar (fuera de esta
-- migración): la app rellena route_km/route_min al salir y
-- sube la foto a delivery-photos/<order_id>/... antes de
-- llamar finish_delivery con p_photo_url.
-- =============================================================

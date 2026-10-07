-- =========================================
-- Fixes de auditoría NeoCharge (2026-10-07)
-- Hallazgos de /tmp/auditoria-neocharge/integracion-socios.md (H1-H10)
-- y panel-admin.md (H5, H8, H9).
--
-- IDEMPOTENTE: CREATE OR REPLACE en funciones, DROP TRIGGER/POLICY/
-- CONSTRAINT IF EXISTS antes de crear. NO toca datos existentes salvo
-- que se indique (solo se relaja un CHECK; ninguna fila se modifica).
--
-- No modifica la migración original 20261006190000_partner_fulfillment.sql.
--
-- CONTRATOS CON EL FRENTE DE CÓDIGO (los implementa otro subagente):
--  1. Eliminar el fallback a insert directo en
--     src/components/gestor/RegistrarVentaDialog.tsx (líneas ~328-362) y el
--     de src/hooks/admin/use-admin-sales.ts: el INSERT directo a
--     seller_sales queda reservado a admin/owner (M2) y los gestores DEBEN
--     usar register_sale_with_fulfillment(). El fallback del gestor hoy solo
--     se activa si la RPC "no existe"; con esta migración aplicada, un
--     insert directo de gestor falla por RLS (que es lo deseado).
--  2. get_partner_sale_sources() devuelve NULL en partner_price y
--     partner_currency para no-admin (M8): RegistrarVentaDialog.tsx y
--     AdminSales.tsx deben ocultar el desglose de costo/margen cuando
--     partner_price IS NULL.
--  3. p_commission_amount / p_commission_currency de la RPC se IGNORAN
--     (M1): la comisión se calcula server-side. El cliente puede seguir
--     enviándolos; no tienen efecto.
--
-- OBSERVACIÓN (verificar en producción, fuera del alcance de estos fixes):
-- la migración 20260814 define seller_sales.delivery_type con
-- CHECK IN ('local','delivery','pickup'), pero el diálogo de venta y
-- use-admin-sales.ts envían 'recogida'/'mensajeria' a la RPC. Si en
-- producción el CHECK siguiera siendo el original, todas las ventas por
-- RPC fallarían; lo más probable es que ya fue relajado por dashboard.
-- Esta migración NO lo toca. La validación H7-int usa los valores reales
-- que envía la app ('recogida'/'mensajeria').
-- =========================================

-- =========================================
-- M1 (H2-int) + M3 (H1-int) + M4 (H4-int) + H7-int + H8-admin + H9-int:
-- register_sale_with_fulfillment reescrita con validación server-side
-- completa. Cambios respecto a la versión original:
--  * M1: p_commission_amount/p_commission_currency se IGNORAN; la comisión
--    se deriva server-side: venta de socio → 0; venta propia con markup
--    (p_price > precio base) → 0; venta propia a precio base → 2000 CUP.
--    "Precio base" = products.price (columna en USD). Si la venta es en CUP,
--    el base se convierte con la tasa vigente (price * tasa); sin tasa
--    válida no se puede verificar el "precio base" y se trata como markup
--    → comisión 0 (conservador: nunca se paga un bono que no se puede
--    verificar). commission_currency siempre 'CUP'.
--  * M3: la rama 'own' rechaza la venta si own_stock = 0 y el producto
--    tiene stock > 0 en locales de socios activos (antes se rompía el
--    invariante products.stock = own_stock + Σ stock en socios y se
--    saltaba el hold del ledger).
--  * M4: si p_source_type='partner' y hay CUP involucrado (venta o costo)
--    sin tasa válida, RAISE EXCEPTION en vez de registrar la venta sin
--    hold (fail closed; antes era fail open silencioso).
--  * H7-int: p_delivery_type='recogida' exige pl.pickup_enabled;
--    'mensajeria' exige pl.delivery_enabled (antes solo lo validaba el
--    cliente).
--  * H8-admin: margen < 0 → RAISE EXCEPTION ('venta por debajo del costo
--    del socio'). Margen = 0 se permite pero sin hold (como hasta ahora;
--    queda trazabilidad en seller_sales.margin_held_usd = 0).
--  * H9-int: ROUND(v_margin_usd, 2) al insertar el hold y en
--    margin_held_usd (antes quedaba polvo numérico de centavos).
-- La validación de stock de la rama 'own' se movió ANTES del INSERT
-- (fail fast); todo sigue siendo una sola transacción, así que el
-- comportamiento ante errores es idéntico (rollback total).
-- =========================================
CREATE OR REPLACE FUNCTION public.register_sale_with_fulfillment(
  p_seller_user_id uuid,
  p_seller_name text,
  p_product_id uuid,
  p_product_name text,
  p_price numeric,
  p_currency text,
  p_customer_name text,
  p_customer_phone text,
  p_commission_amount numeric,   -- IGNORADO (M1): se calcula server-side
  p_commission_currency text,    -- IGNORADO (M1): siempre 'CUP'
  p_sale_details text,
  p_delivery_type text,
  p_source_type text,
  p_partner_id uuid,
  p_partner_location_id uuid,
  p_location_name text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_margin_usd numeric;
  v_price_usd numeric;
  v_rate numeric;
  v_partner_price numeric;
  v_partner_currency text;
  v_loc_id uuid;
  v_pickup_enabled boolean;
  v_delivery_enabled boolean;
  v_qty integer;
  v_own integer;
  v_stock integer;
  v_base_usd numeric;
  v_base_in_sale_ccy numeric;
  v_commission_amount numeric;
  v_commission_currency text;
  v_has_partner_stock boolean;
BEGIN
  -- Seguridad: autenticado, rol vendedor, y solo tus propias ventas.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_seller_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'No puedes registrar ventas de otro vendedor';
  END IF;
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar ventas';
  END IF;

  IF p_source_type NOT IN ('own', 'partner') THEN
    RAISE EXCEPTION 'source_type inválido';
  END IF;
  IF p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'El precio debe ser mayor que 0';
  END IF;
  IF p_currency NOT IN ('USD', 'CUP') THEN
    RAISE EXCEPTION 'Moneda inválida';
  END IF;

  -- ---------- M1: comisión server-side (se ignora lo que envíe el cliente)
  v_commission_amount := 0;
  v_commission_currency := 'CUP';
  IF p_source_type = 'own' THEN
    SELECT price INTO v_base_usd FROM public.products WHERE id = p_product_id;
    IF v_base_usd IS NOT NULL THEN
      IF p_currency = 'USD' THEN
        v_base_in_sale_ccy := v_base_usd;
      ELSE
        SELECT usd_to_cup INTO v_rate FROM public.exchange_rates ORDER BY rate_date DESC LIMIT 1;
        IF v_rate IS NOT NULL AND v_rate > 0 THEN
          v_base_in_sale_ccy := v_base_usd * v_rate;
        ELSE
          v_base_in_sale_ccy := NULL; -- sin tasa: no verificable → 0
        END IF;
      END IF;
      IF v_base_in_sale_ccy IS NOT NULL AND p_price <= v_base_in_sale_ccy THEN
        v_commission_amount := 2000;
      END IF;
    END IF;
  END IF;

  -- Margen en USD si la venta es de un socio (precio del socio desde la BD).
  IF p_source_type = 'partner' THEN
    IF p_partner_id IS NULL OR p_partner_location_id IS NULL THEN
      RAISE EXCEPTION 'Falta el socio o el local de la venta';
    END IF;

    -- El socio debe suplir este producto (y estar activo).
    SELECT pp.partner_price, pp.partner_currency
      INTO v_partner_price, v_partner_currency
    FROM public.product_partners pp
    WHERE pp.product_id = p_product_id
      AND pp.partner_id = p_partner_id
      AND pp.is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese socio no suple este producto';
    END IF;

    -- El local debe pertenecer a ese socio (y estar activo).
    SELECT pl.id, pl.pickup_enabled, pl.delivery_enabled
      INTO v_loc_id, v_pickup_enabled, v_delivery_enabled
    FROM public.partner_locations pl
    WHERE pl.id = p_partner_location_id
      AND pl.partner_id = p_partner_id
      AND pl.is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese local no pertenece al socio';
    END IF;

    -- H7-int: el tipo de entrega debe estar habilitado en el local.
    IF p_delivery_type = 'recogida' AND NOT COALESCE(v_pickup_enabled, false) THEN
      RAISE EXCEPTION 'Ese local no ofrece recogida';
    END IF;
    IF p_delivery_type = 'mensajeria' AND NOT COALESCE(v_delivery_enabled, false) THEN
      RAISE EXCEPTION 'Ese local no ofrece mensajería';
    END IF;

    -- Debe haber stock real en ese local (bloqueo de fila).
    SELECT s.quantity INTO v_qty
    FROM public.partner_location_stock s
    WHERE s.product_id = p_product_id
      AND s.partner_location_id = p_partner_location_id
    FOR UPDATE;
    IF v_qty IS NULL OR v_qty < 1 THEN
      RAISE EXCEPTION 'Sin stock de ese producto en el local elegido';
    END IF;

    -- Margen: precio de venta en USD menos lo que retiene el socio.
    IF p_currency = 'USD' THEN
      v_price_usd := p_price;
    ELSE
      SELECT usd_to_cup INTO v_rate FROM public.exchange_rates ORDER BY rate_date DESC LIMIT 1;
      v_price_usd := CASE WHEN v_rate IS NOT NULL AND v_rate > 0 THEN p_price / v_rate ELSE NULL END;
    END IF;
    -- Si el costo del socio no está en USD, se convierte con la misma tasa.
    IF v_partner_currency = 'CUP' THEN
      SELECT usd_to_cup INTO v_rate FROM public.exchange_rates ORDER BY rate_date DESC LIMIT 1;
      v_partner_price := CASE WHEN v_rate IS NOT NULL AND v_rate > 0 THEN v_partner_price / v_rate ELSE NULL END;
    END IF;

    -- M4 (fail closed): v_price_usd / v_partner_price solo pueden ser NULL
    -- por falta de tasa válida con CUP involucrado. Antes la venta se
    -- registraba igual pero sin hold; ahora se rechaza.
    IF v_price_usd IS NULL OR v_partner_price IS NULL THEN
      RAISE EXCEPTION 'Sin tasa de cambio válida: no se puede calcular el margen en USD';
    END IF;

    -- H9-int: redondeo a centavos (evita polvo numérico en el ledger).
    v_margin_usd := ROUND(v_price_usd - v_partner_price, 2);

    -- H8-admin: vender por debajo del costo del socio es pérdida directa.
    -- Margen = 0 se permite pero sin hold (trazabilidad en margin_held_usd).
    IF v_margin_usd < 0 THEN
      RAISE EXCEPTION 'Venta por debajo del costo del socio (margen % USD)', v_margin_usd;
    END IF;
  ELSE
    -- Rama 'own': validación de stock con bloqueo de fila, ANTES del INSERT.
    SELECT own_stock, stock INTO v_own, v_stock
    FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF v_stock IS NULL OR v_stock < 1 THEN
      RAISE EXCEPTION 'Sin stock disponible de ese producto';
    END IF;
    -- M3: sin stock propio pero con stock en socios → la venta tiene que ir
    -- por la rama 'partner'. (Si own_stock > 0 la venta propia es legítima
    -- aunque haya stock mixto.)
    IF COALESCE(v_own, 0) < 1 THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.product_partners pp
        JOIN public.partners ptn
          ON ptn.id = pp.partner_id AND ptn.is_active
        JOIN public.partner_location_stock s
          ON s.product_id = pp.product_id AND s.quantity > 0
        JOIN public.partner_locations pl
          ON pl.id = s.partner_location_id
         AND pl.partner_id = pp.partner_id
         AND pl.is_active
        WHERE pp.product_id = p_product_id
          AND pp.is_active
      ) INTO v_has_partner_stock;
      IF v_has_partner_stock THEN
        RAISE EXCEPTION 'Este producto tiene stock en locales de socios: registra la venta como venta de socio';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.seller_sales (
    seller_user_id, seller_name, product_id, product_name, price, currency,
    customer_name, customer_phone, commission_amount, commission_currency,
    sale_details, delivery_type, source_type, partner_id, partner_location_id,
    partner_price, margin_held_usd, location_name
  ) VALUES (
    p_seller_user_id, p_seller_name, p_product_id, p_product_name, p_price, p_currency,
    NULLIF(p_customer_name, ''), NULLIF(p_customer_phone, ''),
    v_commission_amount, v_commission_currency,
    NULLIF(p_sale_details, ''), NULLIF(p_delivery_type, ''),
    p_source_type, p_partner_id, p_partner_location_id,
    v_partner_price, v_margin_usd, NULLIF(p_location_name, '')
  )
  RETURNING id INTO v_sale_id;

  IF p_source_type = 'partner' THEN
    -- Hold en el ledger del socio (solo si el margen es positivo).
    IF v_margin_usd IS NOT NULL AND v_margin_usd > 0 THEN
      INSERT INTO public.partner_ledger (partner_id, kind, amount_usd, sale_id, notes)
      VALUES (p_partner_id, 'hold', v_margin_usd, v_sale_id, 'Venta: ' || p_product_name);
    END IF;
    -- Descontar del local del socio y re-sincronizar el total.
    UPDATE public.partner_location_stock
    SET quantity = v_qty - 1, updated_at = now()
    WHERE product_id = p_product_id AND partner_location_id = p_partner_location_id;
    UPDATE public.products
    SET stock = GREATEST(0, stock - 1), updated_at = now()
    WHERE id = p_product_id;
  ELSE
    -- Venta propia: descontar de lo propio si hay; si no, del total
    -- (transición: productos aún no configurados en el sistema de socios).
    IF v_own IS NOT NULL AND v_own >= 1 THEN
      UPDATE public.products
      SET own_stock = v_own - 1,
          stock = GREATEST(0, v_stock - 1),
          updated_at = now()
      WHERE id = p_product_id;
    ELSE
      UPDATE public.products
      SET stock = GREATEST(0, v_stock - 1), updated_at = now()
      WHERE id = p_product_id;
    END IF;
  END IF;

  RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_sale_with_fulfillment(
  uuid, text, uuid, text, numeric, text, text, text, numeric, text, text, text, text, uuid, uuid, text
) TO authenticated;

-- =========================================
-- M8 (H3-int): get_partner_sale_sources oculta el costo del socio a
-- gestores. Las columnas partner_price / partner_currency se mantienen
-- (mismo RETURNS TABLE, no se rompen tipos) pero valen NULL para quien
-- no sea admin/owner. Los gestores no necesitan el costo: su comisión es
-- fija (M1) y el margen lo calcula la RPC server-side.
-- CONTRATO CON EL FRENTE: ocultar el desglose de costo/margen en
-- RegistrarVentaDialog.tsx y AdminSales.tsx cuando partner_price IS NULL.
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
DECLARE
  v_see_costs boolean;
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

  -- M8: el costo del socio es dato interno del negocio.
  v_see_costs := public.has_role(auth.uid(), 'admin')
              OR public.has_role(auth.uid(), 'owner');

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    CASE WHEN v_see_costs THEN pp.partner_price ELSE NULL END,
    CASE WHEN v_see_costs THEN pp.partner_currency ELSE NULL END,
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
-- M2 (H5-int / H7-admin): endurecer seller_sales.
-- Se elimina el INSERT directo para vendedores: a partir de ahora SOLO
-- admin/owner pueden insertar directo en seller_sales; los gestores están
-- obligados a usar register_sale_with_fulfillment() (que es SECURITY
-- DEFINER, corre como postgres y por tanto no la afectan estas policies).
-- De paso se incluye a 'owner' en la policy de gestión (antes solo
-- 'admin': H17 del informe del panel).
-- NOTA PARA EL FRENTE: el fallback a insert directo de
-- RegistrarVentaDialog.tsx debe eliminarse (ver contrato en el encabezado).
-- El fallback de use-admin-sales.ts para ventas de texto libre sigue
-- funcionando porque el panel lo usa con rol admin/owner.
-- =========================================
DROP POLICY IF EXISTS "Sellers insert own sales" ON public.seller_sales;
DROP POLICY IF EXISTS "Admins manage seller sales" ON public.seller_sales;
CREATE POLICY "Admins manage seller sales"
  ON public.seller_sales FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
-- ("Sellers view own sales" se conserva: los gestores siguen viendo sus
-- propias ventas en su panel.)

-- CHECK defensivo: la comisión nunca puede ser negativa.
-- NOT VALID a propósito: no se reescribe ni se re-valida la data existente;
-- solo rige para filas nuevas. (Para validar el histórico:
--  ALTER TABLE public.seller_sales VALIDATE CONSTRAINT
--    seller_sales_commission_amount_nonneg;)
ALTER TABLE public.seller_sales
  DROP CONSTRAINT IF EXISTS seller_sales_commission_amount_nonneg;
ALTER TABLE public.seller_sales
  ADD CONSTRAINT seller_sales_commission_amount_nonneg
  CHECK (commission_amount >= 0) NOT VALID;

-- =========================================
-- M6 (H10-int / H4-admin): borrar una venta revierte sus efectos.
-- Trigger AFTER DELETE en seller_sales:
--  * Venta de socio con hold (margin_held_usd > 0): inserta un 'adjustment'
--    compensatorio de -margin_held_usd (sale_id NULL, nota explicativa).
--    El hold original se conserva huérfano como historial; el ajuste lo
--    cancela aritméticamente en partner_balances.
--  * Stock: se devuelve 1 unidad. En venta de socio, al local original si
--    la fila de partner_location_stock aún existe (y siempre al total
--    products.stock, que la RPC había decrementado); si el local ya no
--    existe, solo al total. En venta propia, a products.stock y own_stock
--    (réplica exacta de la rama 'own' de la RPC).
--  * Ventas con source_type NULL (legacy / inserts directos antiguos): no
--    se toca el stock porque la procedencia es desconocida (no se sabe si
--    la venta original lo decrementó).
-- Para permitir adjustments negativos se relaja el CHECK de
-- partner_ledger.amount_usd: holds y pickups siguen exigiendo >= 0, los
-- adjustments pueden ser de cualquier signo (la vista partner_balances ya
-- los suma con signo: holds − pickups + adjustments).
-- =========================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.partner_ledger'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%amount_usd%'
  LOOP
    EXECUTE format('ALTER TABLE public.partner_ledger DROP CONSTRAINT %I', r.conname);
  END LOOP;
END
$$;

ALTER TABLE public.partner_ledger
  DROP CONSTRAINT IF EXISTS partner_ledger_amount_sign_check;
ALTER TABLE public.partner_ledger
  ADD CONSTRAINT partner_ledger_amount_sign_check
  CHECK (kind = 'adjustment' OR amount_usd >= 0);

CREATE OR REPLACE FUNCTION public.reverse_sale_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loc_exists boolean;
BEGIN
  -- Reversar el hold del socio (solo si hubo hold: margin_held_usd > 0).
  IF OLD.source_type = 'partner'
     AND OLD.partner_id IS NOT NULL
     AND OLD.margin_held_usd IS NOT NULL
     AND OLD.margin_held_usd > 0 THEN
    INSERT INTO public.partner_ledger (partner_id, kind, amount_usd, sale_id, notes)
    VALUES (
      OLD.partner_id,
      'adjustment',
      -OLD.margin_held_usd,
      NULL,
      'Reversión de venta eliminada ' || OLD.id::text
        || ': se revierte el hold de $' || OLD.margin_held_usd::text || ' USD'
        || COALESCE(' (' || OLD.product_name || ')', '')
    );
  END IF;

  -- Devolver 1 unidad al stock.
  IF OLD.product_id IS NOT NULL THEN
    IF OLD.source_type = 'partner' THEN
      IF OLD.partner_location_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM public.partner_location_stock
          WHERE product_id = OLD.product_id
            AND partner_location_id = OLD.partner_location_id
        ) INTO v_loc_exists;
        IF v_loc_exists THEN
          UPDATE public.partner_location_stock
          SET quantity = quantity + 1, updated_at = now()
          WHERE product_id = OLD.product_id
            AND partner_location_id = OLD.partner_location_id;
        END IF;
      END IF;
      -- El total siempre se había decrementado en la venta.
      UPDATE public.products
      SET stock = stock + 1, updated_at = now()
      WHERE id = OLD.product_id;
    ELSIF OLD.source_type = 'own' THEN
      UPDATE public.products
      SET stock = stock + 1,
          own_stock = own_stock + 1,
          updated_at = now()
      WHERE id = OLD.product_id;
    END IF;
    -- source_type NULL: procedencia desconocida, no se toca el stock.
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_sale_on_delete ON public.seller_sales;
CREATE TRIGGER trg_reverse_sale_on_delete
  AFTER DELETE ON public.seller_sales
  FOR EACH ROW EXECUTE FUNCTION public.reverse_sale_on_delete();

-- =========================================
-- M7 (H8-int / H6-admin): impedir cobros que dejen el saldo en negativo.
-- Se elige TRIGGER (BEFORE INSERT en partner_ledger) en vez de una
-- función dedicada register_partner_pickup(): el trigger cubre TODAS las
-- vías de inserción (panel, SQL editor, código futuro), mientras que una
-- función solo protege a quien se acuerde de llamarla. El hook
-- use-admin-partners.ts puede seguir insertando directo: el servidor lo
-- valida.
-- El cobro se rechaza si amount_usd > saldo (holds − pickups +
-- adjustments). Se toma lock de la fila del socio para que dos cobros
-- concurrentes no dejen el saldo en negativo (carrera residual mínima a
-- esta escala, documentada).
-- =========================================
CREATE OR REPLACE FUNCTION public.cap_partner_pickup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  IF NEW.kind <> 'pickup' THEN
    RETURN NEW;
  END IF;

  -- Serializa los cobros por socio.
  PERFORM 1 FROM public.partners WHERE id = NEW.partner_id FOR UPDATE;

  SELECT COALESCE(SUM(CASE WHEN kind = 'hold' THEN amount_usd ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN kind = 'pickup' THEN amount_usd ELSE 0 END), 0)
       + COALESCE(SUM(CASE WHEN kind = 'adjustment' THEN amount_usd ELSE 0 END), 0)
    INTO v_balance
  FROM public.partner_ledger
  WHERE partner_id = NEW.partner_id;

  IF NEW.amount_usd > v_balance THEN
    RAISE EXCEPTION 'El cobro ($% USD) supera el saldo pendiente ($% USD) del socio',
      NEW.amount_usd, v_balance;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cap_partner_pickup ON public.partner_ledger;
CREATE TRIGGER trg_cap_partner_pickup
  BEFORE INSERT ON public.partner_ledger
  FOR EACH ROW EXECUTE FUNCTION public.cap_partner_pickup();

-- =========================================
-- H5-admin: editar el precio/moneda de una venta de socio re-sincroniza
-- el hold. Trigger BEFORE UPDATE en seller_sales: si cambia price o
-- currency en una venta con source_type='partner', recalcula
-- margin_held_usd con la tasa actual y el precio del socio (leído de
-- product_partners, nunca del cliente) y ajusta el hold del ledger:
-- actualiza el hold vinculado a ese sale_id; si no hay hold y el margen
-- nuevo es > 0, lo crea; si el margen nuevo es <= 0, elimina el hold
-- (ya no hay nada que retener). También actualiza seller_sales.
-- partner_price (convención heredada: siempre en USD).
-- Si la asociación socio-producto ya no existe o falta la tasa con CUP
-- involucrado, la edición se rechaza o se deja el hold intacto según el
-- caso (ver código); nunca se deja un hold desactualizado en silencio
-- cuando hay datos para recalcularlo.
-- =========================================
CREATE OR REPLACE FUNCTION public.sync_partner_hold_on_sale_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_price numeric;
  v_partner_currency text;
  v_rate numeric;
  v_price_usd numeric;
  v_cost_usd numeric;
  v_hold_exists boolean;
BEGIN
  IF OLD.source_type IS DISTINCT FROM 'partner' THEN
    RETURN NEW;
  END IF;
  IF NEW.price IS NOT DISTINCT FROM OLD.price
     AND NEW.currency IS NOT DISTINCT FROM OLD.currency THEN
    RETURN NEW;
  END IF;
  -- Sin socio o producto no se puede recalcular: se conserva el hold tal
  -- cual (el admin debe ajustarlo a mano). No se bloquea la edición.
  IF NEW.partner_id IS NULL OR NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pp.partner_price, pp.partner_currency
    INTO v_partner_price, v_partner_currency
  FROM public.product_partners pp
  WHERE pp.product_id = NEW.product_id
    AND pp.partner_id = NEW.partner_id
    AND pp.is_active;
  IF NOT FOUND THEN
    -- La asociación ya no existe: no hay base para recalcular.
    RETURN NEW;
  END IF;

  SELECT usd_to_cup INTO v_rate
  FROM public.exchange_rates ORDER BY rate_date DESC LIMIT 1;

  IF NEW.currency = 'USD' THEN
    v_price_usd := NEW.price;
  ELSIF v_rate IS NOT NULL AND v_rate > 0 THEN
    v_price_usd := NEW.price / v_rate;
  ELSE
    RAISE EXCEPTION 'No hay tasa de cambio válida para recalcular el margen de la venta';
  END IF;

  IF v_partner_currency = 'CUP' THEN
    IF v_rate IS NULL OR v_rate <= 0 THEN
      RAISE EXCEPTION 'No hay tasa de cambio válida para recalcular el costo del socio';
    END IF;
    v_cost_usd := v_partner_price / v_rate;
  ELSE
    v_cost_usd := v_partner_price;
  END IF;

  NEW.margin_held_usd := ROUND(v_price_usd - v_cost_usd, 2);
  NEW.partner_price := ROUND(v_cost_usd, 2);

  SELECT EXISTS (
    SELECT 1 FROM public.partner_ledger
    WHERE sale_id = NEW.id AND kind = 'hold'
  ) INTO v_hold_exists;

  IF v_hold_exists THEN
    IF NEW.margin_held_usd > 0 THEN
      UPDATE public.partner_ledger
      SET amount_usd = NEW.margin_held_usd,
          notes = 'Ajuste por edición de venta: ' || COALESCE(NEW.product_name, '')
      WHERE sale_id = NEW.id AND kind = 'hold';
    ELSE
      -- Margen <= 0: ya no hay nada que retener; se elimina el hold.
      DELETE FROM public.partner_ledger
      WHERE sale_id = NEW.id AND kind = 'hold';
    END IF;
  ELSIF NEW.margin_held_usd > 0 THEN
    INSERT INTO public.partner_ledger (partner_id, kind, amount_usd, sale_id, notes)
    VALUES (
      NEW.partner_id, 'hold', NEW.margin_held_usd, NEW.id,
      'Hold creado por edición de venta: ' || COALESCE(NEW.product_name, '')
    );
  END IF;
  -- Margen <= 0 sin hold previo: no se crea movimiento (trazabilidad en
  -- seller_sales.margin_held_usd, igual que en la RPC).

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_partner_hold_on_sale_update ON public.seller_sales;
CREATE TRIGGER trg_sync_partner_hold_on_sale_update
  BEFORE UPDATE ON public.seller_sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_partner_hold_on_sale_update();

-- =========================================
-- H9-admin: impedir eliminar un socio con saldo pendiente.
-- Trigger BEFORE DELETE en partners: si holds − pickups + adjustments
-- != 0, RAISE EXCEPTION. Así el ON DELETE CASCADE de locales,
-- asociaciones, stock y ledger no puede borrar en silencio dinero que el
-- socio aún debe (o que se le debe). Para eliminar al socio hay que dejar
-- el saldo en 0 primero (cobro o ajuste).
-- =========================================
CREATE OR REPLACE FUNCTION public.block_partner_delete_with_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT COALESCE(SUM(CASE WHEN kind = 'hold' THEN amount_usd ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN kind = 'pickup' THEN amount_usd ELSE 0 END), 0)
       + COALESCE(SUM(CASE WHEN kind = 'adjustment' THEN amount_usd ELSE 0 END), 0)
    INTO v_balance
  FROM public.partner_ledger
  WHERE partner_id = OLD.id;

  IF v_balance <> 0 THEN
    RAISE EXCEPTION 'No se puede eliminar el socio "%" con saldo pendiente de % USD: registra el cobro o un ajuste primero',
      OLD.name, v_balance;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_partner_delete_with_balance ON public.partners;
CREATE TRIGGER trg_block_partner_delete_with_balance
  BEFORE DELETE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.block_partner_delete_with_balance();

-- =========================================
-- FIX delivery_type CHECK (hallazgo de verificación pre-aplicación):
-- la migración 20260814 definió seller_sales.delivery_type con
-- CHECK IN ('local','delivery','pickup'), pero la app envía
-- 'recogida'/'mensajeria' a la RPC. Se relaja el CHECK para aceptar
-- los valores reales. Idempotente.
-- =========================================
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.seller_sales'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%delivery_type%';
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.seller_sales DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.seller_sales
  ADD CONSTRAINT seller_sales_delivery_type_check
  CHECK (delivery_type IN ('local','delivery','pickup','recogida','mensajeria'));

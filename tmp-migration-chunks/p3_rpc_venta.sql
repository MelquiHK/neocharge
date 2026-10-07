-- Función: registrar venta con surtido (transaccional)
-- Inserta la venta, crea el hold en el ledger del socio y descuenta
-- stock de la fuente correcta. Todo o nada.
-- Validación server-side: no se confía en lo que envía el cliente.
-- Solo roles: admin, owner, gestor. Cada uno registra sus propias ventas.
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
  p_commission_amount numeric,
  p_commission_currency text,
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
  v_qty integer;
  v_own integer;
  v_stock integer;
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
    SELECT pl.id INTO v_loc_id
    FROM public.partner_locations pl
    WHERE pl.id = p_partner_location_id
      AND pl.partner_id = p_partner_id
      AND pl.is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ese local no pertenece al socio';
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
    v_margin_usd := CASE
      WHEN v_price_usd IS NULL OR v_partner_price IS NULL THEN NULL
      ELSE v_price_usd - v_partner_price
    END;
  END IF;

  INSERT INTO public.seller_sales (
    seller_user_id, seller_name, product_id, product_name, price, currency,
    customer_name, customer_phone, commission_amount, commission_currency,
    sale_details, delivery_type, source_type, partner_id, partner_location_id,
    partner_price, margin_held_usd, location_name
  ) VALUES (
    p_seller_user_id, p_seller_name, p_product_id, p_product_name, p_price, p_currency,
    NULLIF(p_customer_name, ''), NULLIF(p_customer_phone, ''),
    p_commission_amount, p_commission_currency,
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
    SELECT own_stock, stock INTO v_own, v_stock
    FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF v_stock IS NULL OR v_stock < 1 THEN
      RAISE EXCEPTION 'Sin stock disponible de ese producto';
    END IF;
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

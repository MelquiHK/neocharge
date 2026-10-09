-- Auto-decrementa el stock al crear un pedido y lo restaura si se cancela.
-- Los items del pedido guardan {id: <uuid del producto>, quantity: <n>}.
-- Un item malformado nunca tumba el pedido (se salta con CONTINUE).

CREATE OR REPLACE FUNCTION public.adjust_stock_for_order()
RETURNS TRIGGER AS $$
DECLARE
  item JSONB;
  pid UUID;
  qty INT;
  delta INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := -1; -- nuevo pedido: restar stock
  ELSIF TG_OP = 'UPDATE'
        AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
      delta := 1; -- se canceló: devolver stock
    ELSE
      RETURN NEW; -- otro cambio de status: no tocar stock
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::JSONB))
  LOOP
    BEGIN
      pid := NULLIF(item->>'id', '')::UUID;
      qty := COALESCE((item->>'quantity')::INT, 0);
      IF pid IS NOT NULL AND qty > 0 THEN
        UPDATE public.products
        SET stock = GREATEST(COALESCE(stock, 0) + delta * qty, 0),
            updated_at = now()
        WHERE id = pid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_adjust_stock_for_order ON public.orders;
CREATE TRIGGER trg_adjust_stock_for_order
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_for_order();

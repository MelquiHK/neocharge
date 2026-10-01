-- Alertas de stock: el cliente deja su WhatsApp en la ficha de un producto
-- agotado y el bot de WhatsApp le avisa cuando vuelve a haber stock.
-- La inserción es anónima (los clientes no están logueados); solo
-- service_role (el bot) puede leer las pendientes y marcarlas como avisadas.

CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_pending
  ON public.stock_alerts (product_id)
  WHERE status = 'pending';

-- Un teléfono solo puede tener una alerta pendiente por producto.
CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_alerts_pending_phone
  ON public.stock_alerts (product_id, phone)
  WHERE status = 'pending';

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Cualquiera (anónimo) puede dejar su número para que le avisen.
DROP POLICY IF EXISTS "Anyone can create stock alerts" ON public.stock_alerts;
CREATE POLICY "Anyone can create stock alerts"
  ON public.stock_alerts FOR INSERT
  WITH CHECK (true);

-- Sin políticas de SELECT/UPDATE/DELETE para anon: los números solo los
-- ve service_role (el bot). PostgREST deniega el resto por defecto.

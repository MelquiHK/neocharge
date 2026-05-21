-- =========================================
-- 7. SITE_SETTINGS (Contenido editable desde Admin)
-- =========================================
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE DEFAULT 'default',
  warranty_intro text,
  warranty_chargers_title text,
  warranty_chargers_text text,
  warranty_electronics_title text,
  warranty_electronics_text text,
  warranty_important_title text,
  warranty_important_text text,
  warranty_support_title text,
  warranty_support_text text,
  whatsapp_url text,
  contact_url text,
  support_phone text,
  support_email text,
  support_address text,
  support_hours text,
  locations_intro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings viewable by everyone"
  ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage site settings"
  ON public.site_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_settings (
  setting_key,
  warranty_intro,
  warranty_chargers_title,
  warranty_chargers_text,
  warranty_electronics_title,
  warranty_electronics_text,
  warranty_important_title,
  warranty_important_text,
  warranty_support_title,
  warranty_support_text,
  whatsapp_url,
  contact_url,
  support_phone,
  support_email,
  support_address,
  support_hours,
  locations_intro
) VALUES (
  'default',
  'Cada producto que sale de nuestros locales se prueba antes de entregarse. Esta es nuestra política clara y honesta para que compres con total tranquilidad.',
  'Prueba al momento de la entrega',
  'Al recibir tu cargador, puedes probarlo en el momento. Si no enciende o presenta algún problema, tienes derecho a cambiarlo por otro o pedir la devolución de tu dinero.',
  'Productos de electrónica',
  'Los demás productos de electrónica se prueban en el lugar al momento de la entrega. Si vienen sellados de fábrica, se entregan en sus condiciones originales y no requieren prueba.',
  'Importante',
  'No se aceptan devoluciones ni cambios si el cargador presenta daños físicos como partiduras, rajaduras en el plástico, señales de golpes, o si se determina que no es uno de los cargadores vendidos por NeoCharge. El cargador debe estar en las mismas condiciones en que fue entregado.',
  '¿Tienes dudas?',
  'Estamos a un mensaje de distancia. Escríbenos por WhatsApp o visítanos en cualquiera de nuestros locales.',
  'https://wa.me/5363180910',
  '/contacto',
  '+53 6318-0910',
  'habanasound90@gmail.com',
  'D entre 21 y 23, Vedado, La Habana',
  'Atención 24 horas, todos los días',
  'Compra en cualquiera de nuestros locales. Activa los filtros y revisa stock en tiempo real para cada punto de venta.'
) ON CONFLICT (setting_key) DO NOTHING;

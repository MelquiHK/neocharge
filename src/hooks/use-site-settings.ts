import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteSettings } from "@/types";

const DEFAULT_SETTINGS: SiteSettings = {
  setting_key: "default",
  warranty_intro: "Cada producto que sale de nuestros locales se prueba antes de entregarse. Esta es nuestra política clara y honesta para que compres con total tranquilidad.",
  warranty_chargers_title: "Prueba al momento de la entrega",
  warranty_chargers_text: "Al recibir tu cargador, puedes probarlo en el momento. Si no enciende o presenta algún problema, tienes derecho a cambiarlo por otro o pedir la devolución de tu dinero.",
  warranty_electronics_title: "Productos de electrónica",
  warranty_electronics_text: "Los demás productos de electrónica se prueban en el lugar al momento de la entrega. Si vienen sellados de fábrica, se entregan en sus condiciones originales y no requieren prueba.",
  warranty_important_title: "Importante",
  warranty_important_text: "No se aceptan devoluciones ni cambios si el cargador presenta daños físicos como partiduras, rajaduras en el plástico, señales de golpes, o si se determina que no es uno de los cargadores vendidos por NeoCharge. El cargador debe estar en las mismas condiciones en que fue entregado.",
  warranty_support_title: "¿Tienes dudas?",
  warranty_support_text: "Estamos a un mensaje de distancia. Escríbenos por WhatsApp o visítanos en cualquiera de nuestros locales.",
  whatsapp_url: "https://wa.me/5363180910",
  contact_url: "/contacto",
  support_phone: "+53 6318-0910",
  support_email: "habanasound90@gmail.com",
  support_address: "D entre 21 y 23, Vedado, La Habana",
  support_hours: "Atención 24 horas, todos los días",
  locations_intro: "Compra en cualquiera de nuestros locales. Activa los filtros y revisa stock en tiempo real para cada punto de venta.",
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("site_content_settings")
          .select("*")
          .eq("setting_key", "default")
          .maybeSingle();
        if (error) throw error;
        setSettings({ ...DEFAULT_SETTINGS, ...(data ?? {}) });
      } catch {
        // If the DB schema is missing the `setting_key` column or the new table is not created yet,
        // fall back to default settings so the site keeps working and log for debugging.
        // Admin UI will show a clearer toast when trying to save.
        // Example error message: "column site_content_settings.setting_key does not exist"
        // We intentionally do not surface the DB error here to end users.
        console.warn("useSiteSettings: falling back to DEFAULT_SETTINGS (site_content_settings may not exist or migration not applied)");
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { settings, loading };
}

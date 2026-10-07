export interface AppVersion {
  version: string;
  date: string;
  apkUrl: string;
  size: string;
  highlights: string[];
}

export const APP_VERSIONS: AppVersion[] = [
  {
    version: "1.0.10",
    date: "2026-10-07",
    apkUrl: "/descargas/neocharge-tienda.apk",
    size: "6.2 MB",
    highlights: [
      "Login con Google funcionando en la app instalada",
      "Página de confirmación de pedido con número de orden y botón de WhatsApp",
      "Rastrear pedido por teléfono sin necesidad de cuenta",
      "Sistema de reseñas verificadas",
      "El bot de WhatsApp ahora crea el pedido automáticamente",
      "App más rápida: carga inicial reducida casi a la mitad",
      "Decenas de correcciones de seguridad y estabilidad",
    ],
  },
  {
    version: "1.0.9",
    date: "2026-09-27",
    apkUrl: "",
    size: "6.0 MB",
    highlights: [
      "Burbuja de instalación de la app",
      "Página de descarga /descargar-app",
      "Corrección visual en la app instalada",
    ],
  },
];

export const CURRENT_VERSION = APP_VERSIONS[0];

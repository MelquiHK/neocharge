export interface AppVersion {
  version: string;
  date: string;
  apkUrl: string;
  size: string;
  highlights: string[];
}

export const APP_VERSIONS: AppVersion[] = [
  {
    version: "1.0.12",
    date: "2026-10-09",
    apkUrl: "/descargas/neocharge-tienda.apk",
    size: "5.8 MB",
    highlights: [
      "Icono limpio: rayo blanco en cuadro malva, sin fondo oscuro (favicon y app)",
      "Corrección crítica: el carrito ya no rompe la app al abrirlo por primera vez",
    ],
  },
  {
    version: "1.0.11",
    date: "2026-10-09",
    apkUrl: "",
    size: "6.1 MB",
    highlights: [
      "Icono morado del rayo de vidrio (reemplazado en 1.0.12 por el icono limpio)",
    ],
  },
  {
    version: "1.0.10",
    date: "2026-10-07",
    apkUrl: "",
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

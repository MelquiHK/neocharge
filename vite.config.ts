import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-icon.png', 'icon.svg', 'robots.txt'],
      manifest: {
        name: 'NeoCharge - Electrónica de Próxima Generación',
        short_name: 'NeoCharge',
        lang: 'es',
        description: 'Tu tienda de electrónica de confianza en La Habana. Calidad premium, garantía y entrega 24h.',
        theme_color: '#9e5f8f',
        background_color: '#f9eef2',
        display: 'standalone', // Obligatorio para que abra sin barra de navegador
        start_url: '/',        // Obligatorio para definir dónde empieza la app
        icons: [
          {
            src: 'favicon.ico',
            sizes: '16x16 32x32 48x48',
            type: 'image/x-icon'
          },
          {
            src: 'apple-icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'apple-icon.png', 
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Ayuda a que el icono se vea bien en Android
          }
        ]
      },
      // Esto genera el Service Worker automáticamente en el build
      workbox: {
        // El APK nunca debe caer en el fallback de navegación de la SPA:
        // si el SW sirviera index.html para el .apk, el navegador vería el 404
        // de la app en vez de descargar el archivo.
        navigateFallbackDenylist: [/^\/descargas\/.*\.apk$/],
        // Las imágenes NO se precachean (ahorra ~2MB en la primera carga):
        // se sirven con caché en tiempo de ejecución más abajo.
        // offline-seed.json SÍ se precachea: es el paquete de datos inicial
        // que permite usar la app en la primera instalación sin internet.
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest,woff2}', 'offline-seed.json'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'neocharge-images',
              expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Lecturas GET a la API de Supabase: red primero, caché de 5 min
            // como respaldo. Es una segunda red de seguridad además del caché
            // de la app (IndexedDB): si una lectura del catálogo no pasó por
            // fetchWithCache, igual funciona offline unos minutos.
            // Los POST (pedidos, auth) nunca se cachean.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'neocharge-api',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react", 
      "react-dom", 
      "react/jsx-runtime", 
      "react/jsx-dev-runtime", 
      "@tanstack/react-query", 
      "@tanstack/query-core"
    ],
  },
}));
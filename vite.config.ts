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
        description: 'Tu tienda de electrónica de confianza en La Habana. Calidad premium, garantía y entrega 24h.',
        theme_color: '#3b82f6',
        background_color: '#0f172a',
        display: 'standalone', // Obligatorio para que abra sin barra de navegador
        start_url: '/',        // Obligatorio para definir dónde empieza la app
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64',
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
        // Las imágenes NO se precachean (ahorra ~2MB en la primera carga):
        // se sirven con caché en tiempo de ejecución más abajo.
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest}'],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 1024 * 1024,
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
            // Catálogo offline: las consultas GET a la API REST de Supabase
            // (productos, categorías, servicios) se sirven con la última copia
            // guardada y se revalidan en segundo plano cuando hay conexión.
            // POST/PUT/DELETE (auth, pedidos) NUNCA se cachean.
            urlPattern: ({ url }) =>
              url.origin.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'StaleWhileRevalidate',
            method: 'GET',
            options: {
              cacheName: 'supabase-api',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
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
  build: {
    // Divide el bundle principal (684KB) en trozos cacheables por separado:
    // el navegador los descarga en paralelo y solo re-descarga el que cambie.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-ui": ["lucide-react", "sonner"],
        },
      },
    },
  },
}));
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
        name: 'NeoCharge Store',
        short_name: 'NeoCharge',
        description: 'Tu tienda de electrónica de confianza',
        theme_color: '#007bff',
        background_color: '#ffffff',
        display: 'standalone', // Obligatorio para que abra sin barra de navegador
        start_url: '/',        // Obligatorio para definir dónde empieza la app
        icons: [
          {
            src: 'favicon.ico',
            sizes: '64x64',
            type: 'image/x-icon'
          },
          {
            src: 'apple-icon.png',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
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
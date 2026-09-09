# Neocharge - E-commerce de Electrónica

Tienda online moderna con integración Supabase, construida con Vite + React + TypeScript.

## Características

- **Autenticación:** Email/password con Supabase Auth
- **Panel admin:** Dashboard con roles y permisos granulares
- **Carrito persistente:** localStorage + Context API
- **Favoritos unificados:** localStorage + sync Supabase
- **Integración WhatsApp:** Checkout directo a WhatsApp
- **Mensajería:** Sistema de entregas con mensajeros
- **PWA:** Instalable como app móvil
- **Responsive:** Diseño mobile-first

## Prerequisitos

- Node.js 18+
- npm
- Cuenta Supabase

## Instalación

```bash
git clone https://github.com/MelquiHK/neocharge.git
cd neocharge
npm install
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase (ver `.env.example`).

## Desarrollo

```bash
npm run dev
```

Servidor en `http://localhost:8080`

## Scripts

```bash
npm run dev          # Desarrollo local
npm run build        # Build producción
npm run build:dev    # Build en modo development
npm run lint         # ESLint
npm run preview      # Previsualizar build
npm run test         # Tests (Vitest)
npm run test:watch   # Tests en modo watch
```

## Estructura del proyecto

```
src/
├── App.tsx              # Router + providers globales
├── pages/               # Páginas (tienda, admin, blog, etc.)
├── components/
│   ├── admin/           # Panel administrativo
│   ├── sections/        # Secciones del homepage
│   └── ui/              # Componentes shadcn/ui
├── contexts/            # AuthContext, CartContext
├── hooks/               # Hooks personalizados
├── integrations/supabase/
├── lib/                 # Utilidades (whatsapp, pricing, seo)
└── types/               # Tipos TypeScript

supabase/
├── migrations/          # Migraciones de BD (fuente de verdad)
└── scripts/             # SQL manual (RLS, fixes)

docs/                    # Documentación completa del proyecto
```

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | API key pública (anon) |
| `VITE_SUPABASE_PROJECT_ID` | ID del proyecto |

## Deploy en Vercel

1. Conectar repositorio en [vercel.com](https://vercel.com)
2. Agregar las variables de entorno anteriores
3. Build command: `npm run build`
4. Output directory: `dist`

Ver [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) para detalle completo.

## Documentación

Toda la documentación está en la carpeta [`docs/`](./docs/):

- [Setup local](./docs/SETUP.md)
- [Base de datos](./docs/DB_SETUP.md)
- [Arquitectura](./docs/ANALISIS_PROYECTO_COMPLETO.md)
- [Roadmap de mejoras](./docs/MEJORAS_RECOMENDADAS_2026.md)
- [Índice completo](./docs/README.md)

## Licencia

MIT

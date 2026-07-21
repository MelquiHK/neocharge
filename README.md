# Neocharge - E-commerce de Electrónica

Tienda online moderna con integración Supabase, construida con Vite + React + TypeScript.

## 🚀 Características

- **Autenticación:** Email/password con Supabase
- **Gestión de productos:** Admin dashboard completo
- **Carrito persistente:** localStorage + context API
- **Integración WhatsApp:** Checkout directo a WhatsApp
- **Responsive:** Diseño mobile-first
- **TypeScript:** Type-safe en todo el código
- **Tailwind + Radix UI:** UI moderna y accesible

## 📋 Prerequisitos

- Node.js 18+
- npm o yarn
- Cuenta Supabase (gratis en supabase.com)

## 🔧 Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/MelquiHK/neocharge.git
cd neocharge
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env.local
```

Llenar `.env.local` con credenciales de Supabase:
```
VITE_SUPABASE_URL=https://txkgchetianfvypnkziq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_v_tNhI6VgA5oZh0RTV33lQ_-xfuc5Jd
VITE_SUPABASE_PROJECT_ID=txkgchetianfvypnkziq
```

## 💻 Desarrollo

Iniciar servidor de desarrollo:
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:8080`

## 🏗️ Build

Compilar para producción:
```bash
npm run build
```

Output en carpeta `dist/`

## 🌐 Deployment en Vercel

### 1. Conectar repositorio GitHub
- Ir a [vercel.com](https://vercel.com)
- Click "New Project"
- Seleccionar repositorio `neocharge`

### 2. Configurar Environment Variables en Vercel
En el dashboard de Vercel → Settings → Environment Variables, agregar:

```
VITE_SUPABASE_URL              = https://txkgchetianfvypnkziq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY  = sb_publishable_v_tNhI6VgA5oZh0RTV33lQ_-xfuc5Jd
VITE_SUPABASE_PROJECT_ID       = txkgchetianfvypnkziq
```

### 3. Deploy
Vercel detectará automáticamente Vite y hará deploy. El build command es:
```
npm run build
```

Output directory: `dist`

## 📁 Estructura del Proyecto

```
src/
├── App.tsx              # Componente principal
├── main.tsx             # Entry point
├── components/          # Componentes reutilizables
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── admin/           # Dashboard admin
│   └── sections/        # Secciones globales
├── pages/               # Componentes de página
│   ├── Shop.tsx
│   ├── ProductDetail.tsx
│   ├── Auth.tsx
│   ├── Admin.tsx
│   └── Checkout.tsx
├── contexts/            # Global state
│   ├── AuthContext.tsx  # Autenticación Supabase
│   └── CartContext.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts    # Cliente Supabase
│       └── types.ts     # Tipos de BD
├── lib/                 # Utilidades
│   ├── whatsapp.ts
│   └── utils.ts
└── hooks/               # React hooks
```

## 🔑 Variables de Entorno

### Requeridas
- `VITE_SUPABASE_URL` - URL de tu proyecto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` - API key anónima
- `VITE_SUPABASE_PROJECT_ID` - ID del proyecto

## 🛠️ Scripts Disponibles

```bash
npm run dev              # Desarrollo local
npm run build            # Build producción
npm run build:dev        # Build en modo development
npm run lint             # Linting con ESLint
npm run preview          # Previsualizar build
npm run test             # Ejecutar tests
npm run test:watch       # Tests en modo watch
```

## 🗄️ Supabase Setup

### 1. Crear proyecto en Supabase
- Ir a [supabase.com](https://supabase.com)
- Crear nuevo proyecto
- Obtener credenciales en Settings → API

### 2. Crear tablas necesarias
Ver archivo `supabase/migrations/` para el schema completo

### 3. Habilitar autenticación
En Supabase Dashboard → Authentication → Providers
- Email/Password: habilitado por defecto

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios mayores, abre un issue primero.

## 📄 Licencia

Este proyecto está bajo licencia MIT.

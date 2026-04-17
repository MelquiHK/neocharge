# Neocharge - Tienda de Electrónica - Guía de Configuración

## 🚀 Inicio Rápido

Esta es una tienda completa de electrónica construida con Next.js 16, Supabase, y Tailwind CSS. Incluye autenticación, catálogo de productos, blog y panel de administración.

## 📋 Requisitos Previos

- Node.js 18+
- Una cuenta de Supabase (https://supabase.com)
- Variables de entorno configuradas

## 🔧 Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima

# Base URL (para emails y callbacks)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. Base de Datos

Ejecuta el script de migración en tu proyecto Supabase:

1. Ve a Supabase Dashboard → SQL Editor
2. Copia el contenido de `scripts/1-init-database.sql`
3. Pégalo y ejecuta

Este script creará todas las tablas necesarias:
- `profiles` - Perfiles de usuario
- `categories` - Categorías de productos
- `products` - Productos
- `blog_categories` - Categorías de blog
- `blog_posts` - Artículos del blog
- `orders` - Pedidos
- `order_items` - Items de pedidos
- `site_settings` - Configuración del sitio

### 3. Crear Usuario Admin

Crea tu primer usuario admin:

1. Regístrate en la app (`/auth/signup`)
2. Verifica tu email
3. En Supabase, ve a `profiles` y actualiza el registro:
   - Establece `is_admin = true`

## 📁 Estructura del Proyecto

```
app/
├── page.tsx                 # Página principal
├── auth/
│   ├── login/page.tsx      # Login
│   └── signup/page.tsx     # Registro
├── products/
│   ├── page.tsx            # Listado de productos
│   └── [id]/page.tsx       # Detalle del producto
├── blog/
│   ├── page.tsx            # Blog
│   └── [slug]/page.tsx     # Artículo individual
├── about/page.tsx          # Información
└── admin/
    ├── page.tsx            # Dashboard admin
    └── products/page.tsx   # Gestión de productos
├── layout.tsx              # Layout global
└── globals.css             # Estilos globales

lib/
├── auth-actions.ts         # Acciones de autenticación
└── supabase/
    ├── server.ts           # Cliente Supabase servidor
    └── client.ts           # Cliente Supabase cliente

components/
└── header.tsx              # Navegación principal

scripts/
└── 1-init-database.sql     # Script de inicialización BD
```

## 🔐 Autenticación

El sistema usa Supabase Auth con:
- Email y contraseña
- Verificación de email
- Sesiones HTTP-only (seguras)
- RLS (Row Level Security) para proteger datos

## 🛒 Panel de Administrador

Accede en `/admin` con tu cuenta admin.

**Funcionalidades:**
- ✅ Gestionar productos (crear, editar, eliminar)
- ✅ Publicar artículos de blog
- ✅ Ver pedidos de clientes
- ✅ Configurar parámetros de la tienda

## 📱 Páginas Principales

### Públicas
- `/` - Inicio
- `/products` - Catálogo
- `/products/[id]` - Detalle del producto
- `/blog` - Blog
- `/blog/[slug]` - Artículo
- `/about` - Información

### Autenticadas
- `/auth/login` - Iniciar sesión
- `/auth/signup` - Crear cuenta

### Admin
- `/admin` - Dashboard
- `/admin/products` - Gestión de productos
- `/admin/blog` - Gestión de blog
- `/admin/orders` - Gestión de pedidos
- `/admin/settings` - Configuración

## 🚀 Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar desarrollo
pnpm dev

# Build para producción
pnpm build

# Ejecutar producción
pnpm start
```

Abre [http://localhost:3000](http://localhost:3000)

## 🎨 Personalización

### Colores
Edita las variables CSS en `app/globals.css`:
```css
:root {
  --primary: #3b82f6;      /* Azul principal */
  --accent: #10b981;       /* Verde acento */
  --background: #ffffff;   /* Fondo */
}
```

### Fuentes
Las fuentes se cargan en `app/layout.tsx`:
- **Títulos:** Poppins
- **Cuerpo:** PT Sans

### Información de la Tienda
Actualiza los datos en Supabase en la tabla `site_settings`:
- `store_info` - Información de la tienda (dirección, teléfono, horario)
- `about_page` - Contenido de la página de información

## 📦 Dependencias Principales

- **Next.js 16** - Framework React
- **Supabase** - Backend y autenticación
- **Tailwind CSS** - Estilos
- **next-pwa** - Soporte PWA (aplicación instalable)

## 🔒 Seguridad

- ✅ RLS habilitado en Supabase
- ✅ Autenticación segura con JWT
- ✅ Sesiones HTTP-only
- ✅ Validación de servidor
- ✅ Protección CSRF

## 📝 Notas Importantes

### Política de Garantía (Configurada en /about)
- Prueba obligatoria al cliente
- 24 horas para devolver si tiene defectos
- Cambio inmediato sin costo
- Devolución de dinero garantizada

### Opciones de Envío
- Retiro en local (D entre 21 y 23, Vedado, La Habana)
- Mensajería (precio según zona)

### Contacto
- WhatsApp: +53 63180910
- Horario: 24/7

## 🐛 Troubleshooting

### Error de conexión a Supabase
- Verifica las variables de entorno
- Asegúrate de que la URL y clave son correctas

### Error de autenticación
- Limpia las cookies del navegador
- Intenta en modo incógnito

### Productos no aparecen
- Verifica que `is_active = true` en la BD
- Actualiza la página

## 📞 Soporte

Para problemas contacta a través de WhatsApp: +53 63180910

## 📄 Licencia

Este proyecto es propiedad de Neocharge.

---

**Última actualización:** Abril 2024

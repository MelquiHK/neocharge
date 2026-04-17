# Configuración de Base de Datos - Neocharge

## Pasos para Configurar la Base de Datos

### 1. Acceder a Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu proyecto

### 2. Abrir SQL Editor

1. En el panel de Supabase, ve a **SQL Editor**
2. Haz clic en **New Query**

### 3. Copiar y Ejecutar el Script

1. Copia todo el contenido del archivo `scripts/1-init-database.sql`
2. Pégalo en el SQL Editor
3. Haz clic en **Execute** o presiona `Ctrl+Enter`

El script creará:
- ✅ Tablas de perfiles y autenticación
- ✅ Tablas de productos y categorías
- ✅ Tablas de blog y artículos
- ✅ Tablas de pedidos
- ✅ Tabla de configuración
- ✅ Políticas de seguridad (RLS)
- ✅ Índices para optimización

### 4. Verificar la Creación

1. Ve a **Table Editor** en Supabase
2. Deberías ver las siguientes tablas:
   - `profiles`
   - `categories`
   - `products`
   - `blog_categories`
   - `blog_posts`
   - `orders`
   - `order_items`
   - `site_settings`

### 5. Configurar Variables de Entorno

En la raíz del proyecto, crea `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**¿Dónde obtener estas claves?**
1. En Supabase, ve a **Settings** → **API**
2. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` (public) key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 6. Crear tu Primer Usuario Admin

1. Ve a [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup)
2. Crea una cuenta con tu email
3. Verifica tu email
4. En Supabase **Table Editor**:
   - Abre la tabla `profiles`
   - Busca tu registro (por tu email)
   - Edita la columna `is_admin` y cambia a `true`

### 7. ¡Listo!

Ahora puedes:
- 🏠 Acceder a la tienda en http://localhost:3000
- 👤 Iniciar sesión con tu cuenta
- 🔧 Acceder al panel admin en http://localhost:3000/admin
- ➕ Agregar productos y artículos de blog

## Estructura de Datos

### Tabla: profiles
```sql
- id (UUID) - ID del usuario (de Supabase Auth)
- username (TEXT) - Nombre de usuario único
- phone (TEXT) - Teléfono del usuario
- is_admin (BOOLEAN) - Es administrador?
- created_at - Fecha de creación
- updated_at - Última actualización
```

### Tabla: products
```sql
- id (UUID) - ID del producto
- name (TEXT) - Nombre del producto
- price (DECIMAL) - Precio en USD
- description (TEXT) - Descripción
- specifications (TEXT) - Especificaciones técnicas
- stock (INTEGER) - Cantidad disponible
- images (TEXT[]) - Array de URLs de imágenes
- main_image_index (INTEGER) - Índice de imagen principal
- category_id (UUID) - ID de la categoría
- is_active (BOOLEAN) - Producto visible?
- created_at - Fecha de creación
```

### Tabla: blog_posts
```sql
- id (UUID) - ID del artículo
- title (TEXT) - Título
- slug (TEXT) - URL-friendly slug
- excerpt (TEXT) - Resumen corto
- content (TEXT) - Contenido completo (Markdown)
- image_url (TEXT) - Imagen destacada
- category_id (UUID) - ID de la categoría
- author (TEXT) - Autor
- is_published (BOOLEAN) - Publicado?
- created_at - Fecha de creación
```

### Tabla: orders
```sql
- id (UUID) - ID del pedido
- user_id (UUID) - ID del cliente
- total_amount (DECIMAL) - Monto total
- status (TEXT) - Estado (pending, completed, cancelled)
- shipping_address (TEXT) - Dirección de envío
- phone (TEXT) - Teléfono del cliente
- notes (TEXT) - Notas especiales
- created_at - Fecha de creación
```

## Insertar Datos de Prueba

Para agregar datos de prueba, puedes ejecutar en SQL Editor:

```sql
-- Agregar categoría
INSERT INTO categories (name, slug, sort_order)
VALUES ('Electrónica', 'electronica', 1);

-- Agregar producto
INSERT INTO products (name, price, stock, category_id, is_active, description)
VALUES (
  'Cargador USB-C 65W',
  25.99,
  10,
  (SELECT id FROM categories WHERE slug = 'electronica'),
  true,
  'Cargador rápido USB-C de 65W compatible con laptops y teléfonos'
);

-- Agregar configuración
INSERT INTO site_settings (key, value)
VALUES 
  ('store_info', '{"phone": "+5363180910", "address": "D entre 21 y 23, Vedado, La Habana"}'),
  ('about_page', '{"content": "Tu tienda de electrónica de confianza"}');
```

## Solucionar Problemas

### Las tablas no se crean
- Verifica que el script SQL no tenga errores
- Ejecuta línea por línea si hay error
- Revisa los logs de Supabase

### No puedo acceder al admin
- Asegúrate de que `is_admin = true` en la tabla profiles
- Limpia las cookies del navegador
- Intenta en modo incógnito

### Productos no aparecen
- Verifica que `is_active = true`
- Asegúrate de que la categoría existe
- Recarga la página

## Próximos Pasos

1. **Personalizar información:**
   - Edita la tabla `site_settings` con tus datos
   
2. **Agregar productos:**
   - Ve a `/admin/products` y crea productos
   
3. **Escribir blog:**
   - Ve a `/admin/blog` y publica artículos
   
4. **Configurar envíos:**
   - Actualiza la información de envío en `/admin/settings`

## Ayuda

Si tienes problemas:
1. Revisa [documentación de Supabase](https://supabase.com/docs)
2. Verifica que las variables de entorno sean correctas
3. Comprueba la conexión a la base de datos

---

**¡Listo para comenzar!** 🚀

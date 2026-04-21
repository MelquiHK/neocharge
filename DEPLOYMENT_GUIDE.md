# 🚀 Guía de Deployment en Vercel

## ✅ PRIMERO: Configurar políticas RLS en Supabase (IMPORTANTE)

Las políticas de **Row Level Security (RLS)** controlan quién puede subir archivos y crear productos.

### Paso 1: Abrir Supabase SQL Editor
1. Ve a tu proyecto en **Supabase Dashboard**
2. **SQL Editor** (menú izquierdo)
3. Haz clic en **New Query**

### Paso 2: Copiar y ejecutar las políticas

Abre el archivo `SQL_RLS_POLICIES.sql` en tu proyecto y copia TODO el contenido.

Luego:
1. Pega el SQL en el editor de Supabase
2. Haz clic en **Run** (botón azul)
3. Deberías ver "Success" en verde

**Si algo falla:**
- Abre cada comando por separado y ejecútalos uno a uno
- Algunos pueden fallar si ya existen (eso es normal)

### Paso 3: Verificar que está correcto

En Supabase, ve a:
- **Storage** → **products** → **Policies**
- Deberías ver varias políticas creadas

---

## ✅ Paso 1: Verificar que los cambios están en GitHub

```bash
git log --oneline -3
```

Deberías ver commits recientes.

## ✅ Paso 2: Redeploy en Vercel

### Opción A: Redeploy de último deployment
1. Ve a **Vercel Dashboard**
2. Selecciona tu proyecto **neocharge**
3. Ve a **Deployments**
4. Busca el último deployment (debería estar "Failed" o "Cancelled")
5. Haz clic en **Redeploy**
6. Espera 2-5 minutos

### Opción B: Trigger nuevo deployment con git
```bash
git commit --allow-empty -m "Trigger Vercel redeploy"
git push
```

### Opción C: Manual en Vercel
1. **Vercel Dashboard** → **neocharge**
2. **Settings** → **Git**
3. Desconecta y reconecta tu repositorio

## ✅ Paso 3: Verificar que el build sea exitoso

En **Vercel Dashboard** → **Deployments**:
- 🟢 Build: **Success**
- 🟢 Status: **Ready**

Si ves rojo (error), mira los **Build Logs**.

## ✅ Paso 4: Acceder a tu sitio

La URL será algo como:
```
https://neocharge-xxxxx.vercel.app
```

O si tienes un dominio personalizado.

## ✅ Paso 5: Probar la funcionalidad

1. **Inicia sesión** en tu sitio
2. Ve a `/verify` - verifica que todo sea ✅
3. Ve a `/admin/products/new`
4. Crea un producto:
   - Llena nombre, precio, stock
   - **Sube una imagen**
   - Haz clic en **Crear Producto**
5. ¡Debería funcionar ahora! 🎉

---

## ❌ Si sigue fallando

### Error: "violates row-level security policy"
- Ejecuta nuevamente el SQL de RLS en Supabase

### Error: "Bucket products no existe"
- Crea el bucket en **Storage** → **Create Bucket**
- Nombre: `products`
- Marca como **Public**

### Error: "No tienes permisos de admin"
- En Supabase SQL Editor, ejecuta:
```sql
UPDATE profiles 
SET is_admin = true 
WHERE email = 'tu-email@ejemplo.com';
```

### Verifícalas variables de entorno en Vercel:

1. **Vercel Dashboard** → **neocharge** → **Settings** → **Environment Variables**

Deberían estar:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🔍 Página de Verificación

Una vez el sitio esté live, ve a:
```
https://tu-sitio.vercel.app/verify
```

Esta página verificará que todo esté configurado correctamente.

## 📞 ¿Aún no funciona?

Dime:
1. ¿Qué URL te da el error?
2. ¿El build en Vercel es Success o Failed?
3. ¿Qué ves en Build Logs si falló?
4. ¿Qué error ves exactamente en el navegador?

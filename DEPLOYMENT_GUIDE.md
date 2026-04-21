# 🚀 Guía de Deployment en Vercel

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

## ❌ Si sigue fallando

### Verifícalas variables de entorno en Vercel:

1. **Vercel Dashboard** → **neocharge** → **Settings** → **Environment Variables**

Deberían estar:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Verifica que Supabase esté configurado:

1. En **Supabase Dashboard**:
   - ✅ Proyecto activo y accesible
   - ✅ Bucket `products` en Storage (público)
   - ✅ Tu usuario tiene `is_admin = true` en tabla `profiles`

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

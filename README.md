# NeoCharge - E-commerce Platform

Plataforma de e-commerce completa con panel de administración.

## 🚀 Deployment en Vercel

### Variables de Entorno Requeridas

En tu dashboard de Vercel, configura estas variables de entorno:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui (opcional)
```

### Pasos para Deploy

1. **Conecta tu repositorio** a Vercel
2. **Configura las variables de entorno** (ver arriba)
3. **Deploy automático** - Vercel detectará automáticamente que es un proyecto Next.js

### Configuración de Supabase

1. **Storage Bucket**: Crea un bucket llamado `products` en Supabase Storage
2. **Configura como público** para que las imágenes sean accesibles
3. **Políticas RLS**: Mantén las políticas por defecto inicialmente

### Solución de Problemas Comunes

- **Error de build**: Verifica que todas las variables de entorno estén configuradas
- **Error de imágenes**: Asegúrate de que el bucket `products` existe en Supabase
- **Error de autenticación**: Verifica que las keys de Supabase sean correctas

### Funcionalidades

- ✅ Panel de administración completo
- ✅ Gestión de productos y blog
- ✅ Subida de imágenes desde dispositivo
- ✅ Autenticación con Supabase
- ✅ Base de datos PostgreSQL

¡Tu tienda online está lista para funcionar! 🛒

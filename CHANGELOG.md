# 📝 CHANGELOG - NeoCharge

## [2026-06-18] - Sistema de Notificaciones en Tiempo Real

### ✅ Agregado
- **Hook `useOrderNotifications`** (`src/hooks/admin/use-order-notifications.ts`)
  - Escucha cambios en tiempo real en tabla `orders` via Supabase Realtime
  - Carga pedidos pendientes al inicializar
  - Reproductor de sonido de notificación
  - Notificaciones del navegador (Browser Notification API)
  - Toast de Sonner para cada nuevo pedido
  - Solicita permisos de notificación automáticamente

- **Widget `OrderNotificationsWidget`** (`src/components/admin/OrderNotificationsWidget.tsx`)
  - Botón flotante en esquina inferior derecha del admin
  - Pulsante con badge de contador cuando hay nuevos pedidos
  - Panel expandible mostrando listado de nuevas órdenes
  - Información resumida: número, cliente, total, moneda, cantidad de items
  - Botón para habilitar sonido
  - Botón para limpiar notificaciones
  - Indicador de conexión ("Conectado")
  - Diseño responsivo y accesible

- **Integración en Admin.tsx**
  - Importación e inclusión del `OrderNotificationsWidget`
  - Se renderiza como componente flotante en toda el área del admin
  - No interfiere con navegación existente

### 📊 Documentación
- **MEJORAS_RECOMENDADAS_2026.md** - Documento completo con:
  - 15+ mejoras priorizadas por impacto
  - Plan de implementación de 4 meses
  - Sugerencias específicas por sección
  - Cambios técnicos y de performance
  - Estrategias de marketing y conversión

### 🔍 Cambios Técnicos

#### Dependencias usadas
- `@supabase/supabase-js` - Realtime subscriptions
- `sonner` - Toasts
- `lucide-react` - Iconos
- `tailwindcss` - Estilos

#### RLS Policies requeridas
El widget asume que la tabla `orders` tiene RLS que permite:
- SELECT para todos los usuarios autenticados (filtrando por user_id para clientes)
- SELECT de status='pending' para admins

Ya implementado en migraciones existentes ✓

### 🧪 Testing
✅ Compilación sin errores
✅ TypeScript types correctos
✅ Imports validados

### 🚀 Cómo Usar

1. **En el panel admin**: Un botón flotante aparecerá en esquina inferior derecha
2. **Cliquea el botón**: Se expande panel mostrando nuevos pedidos
3. **Sonido**: Se escucha "ding" cuando llega nuevo pedido
4. **Permiso**: Primera vez pide permiso para notificaciones del navegador

### ⚠️ Consideraciones

- **Browser Notifications**: Requiere permiso del usuario
- **Audio**: El sonido puede estar mutead si el navegador lo está
- **Performance**: Supabase Realtime puede tener latencia en conexiones lentas
- **Escalabilidad**: Si hay >1000 órdenes pendientes, considerar pagination

### 🔗 Relacionado
- [Mejoras Recomendadas](./MEJORAS_RECOMENDADAS_2026.md)
- [Tracking de Pedidos] - Próxima mejora sugerida
- [Analytics Dashboard] - Segunda mejora sugerida

### 💾 Memoria Guardada
- `/memories/repo/neocharge-architecture.md` - Arquitectura completa para referencia futura

---

## Historial Previo de Cambios

### [2026-06-17] - Fixes de Deployment Final
- Eliminado duplicate `mainImage` variable en ProductDetail.tsx
- Validación final de compilación
- Ready for Vercel deployment ✅

### [2026-06-16] - Fase 3: Integraciones Completas
- ✅ Sistema de localización con stock por tienda
- ✅ Admin puede controlar disponibilidad por local
- ✅ Tabla `product_locations` creada con RLS
- ✅ MetaTags dinámicas para OG:image en social sharing
- ✅ Garantía agregada a header navigation

### [2026-06-15] - Fase 2: UX Mejorada
- ✅ ProductDetail con especificaciones formateadas
- ✅ Stock por local con color-coding
- ✅ Thumbnails de imagen mejoradores
- ✅ Admin panel "Stock por local" rediseñado

### [2026-06-14] - Fase 1: Errores de Compilación
- ✅ Hero.tsx JSX syntax error corregido
- ✅ Build error resolved
- ✅ First deployment attempt successful

---

**Estado General**: 🟢 Production Ready

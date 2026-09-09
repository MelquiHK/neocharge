# Scripts SQL auxiliares

Estos archivos son scripts SQL **manuales** para operaciones puntuales en Supabase.
No forman parte del pipeline automático de migraciones (`supabase/migrations/`).

| Archivo | Propósito |
|---------|-----------|
| `SQL_FIX.sql` | Correcciones SQL previas |
| `SQL_AUDIT_FIX.sql` | Fixes de auditoría de BD |
| `SQL_RLS_POLICIES.sql` | Políticas Row Level Security completas |
| `SQL_RLS_SIMPLE.sql` | Configuración RLS simplificada |

## Uso

1. Abrir el SQL Editor en el dashboard de Supabase.
2. Ejecutar el script correspondiente según la necesidad.
3. Para cambios estructurales permanentes, crear una nueva migración en `supabase/migrations/`.

# Documentación NeoCharge

Índice central de toda la documentación del proyecto.

## Empezar aquí

| Documento | Descripción |
|-----------|-------------|
| [SETUP.md](./SETUP.md) | Configuración local (Node, env, Supabase) |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Deploy en Vercel |
| [DB_SETUP.md](./DB_SETUP.md) | Setup de base de datos y migraciones |
| [CHANGELOG.md](../CHANGELOG.md) | Historial de cambios (raíz del repo) |

## Arquitectura

| Documento | Descripción |
|-----------|-------------|
| [ANALISIS_PROYECTO_COMPLETO.md](./ANALISIS_PROYECTO_COMPLETO.md) | Análisis exhaustivo de rutas, páginas y componentes |
| [VISUAL_ARCHITECTURE.md](./VISUAL_ARCHITECTURE.md) | Diagramas y flujos visuales |
| [ANALISIS_ERRORES_Y_ARQUITECTURA.md](./ANALISIS_ERRORES_Y_ARQUITECTURA.md) | Errores conocidos y decisiones de arquitectura |

## Planificación y auditorías

| Documento | Descripción |
|-----------|-------------|
| [MEJORAS_RECOMENDADAS_2026.md](./MEJORAS_RECOMENDADAS_2026.md) | Roadmap de mejoras priorizadas |
| [PLAN_DE_CORRECCION.md](./PLAN_DE_CORRECCION.md) | Plan de correcciones |
| [AUDITORIA_EXHAUSTIVA_2026.md](./AUDITORIA_EXHAUSTIVA_2026.md) | Auditoría completa 2026 |
| [AUDIT_IMPROVEMENTS.md](./AUDIT_IMPROVEMENTS.md) | Mejoras post-auditoría |
| [RESUMEN_EJECUTIVO.md](./RESUMEN_EJECUTIVO.md) | Resumen ejecutivo |
| [SESION_RESUMEN_2026_06_18.md](./SESION_RESUMEN_2026_06_18.md) | Resumen de sesión (notificaciones) |
| [informe_neocharge.md](./informe_neocharge.md) | Informe general del proyecto |

## SQL auxiliar

Scripts SQL fuera de las migraciones automáticas están en [`supabase/scripts/`](../supabase/scripts/).

## Estructura del código

```
src/
├── App.tsx                 # Router principal + providers
├── pages/                  # 19 páginas (tienda, admin, blog, etc.)
├── components/
│   ├── admin/              # 13 módulos del panel admin
│   ├── sections/           # Secciones del homepage
│   └── ui/                 # Primitivos shadcn/ui
├── contexts/               # AuthContext, CartContext
├── hooks/
│   ├── admin/              # Hooks del panel admin
│   └── use-*.ts            # Hooks compartidos
├── integrations/supabase/  # Cliente y tipos de BD
├── lib/                    # Utilidades (whatsapp, pricing, seo, etc.)
└── types/                  # Tipos TypeScript compartidos

supabase/
├── migrations/             # Migraciones versionadas (fuente de verdad)
└── scripts/                # SQL manual (RLS, fixes, auditoría)
```

## Estadísticas

| Métrica | Cantidad |
|---------|----------|
| Páginas | 19 |
| Componentes Admin | 13 |
| Hooks personalizados | 15 |
| Contextos | 2 |
| Rutas | 18+ |
| Migraciones SQL | 11 |

**Última actualización:** 2026-09-09

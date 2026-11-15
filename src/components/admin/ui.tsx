import type { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Sistema visual compartido del panel de administración (NeoCharge)   */
/*  Solo presentación: ningún componente toca lógica, datos ni permisos */
/* ------------------------------------------------------------------ */

/** Tarjeta base de sección: bordes suaves, sombra sutil, padding responsive. */
export function AdminCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/60 bg-card p-5 shadow-soft sm:p-6",
        className
      )}
    >
      {children}
    </section>
  );
}

/** Encabezado de sección: icono en mosaico degradado + título + descripción + acciones. */
export function AdminSectionHeader({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Título interno de tarjeta con icono y acción opcional a la derecha. */
export function AdminCardTitle({
  icon: Icon,
  title,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h3 className="flex items-center gap-2 font-display text-base font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      {action}
    </div>
  );
}

type StatTone = "blue" | "emerald" | "amber" | "violet" | "rose" | "sky" | "slate";

const statToneTile: Record<StatTone, string> = {
  blue: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  sky: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

/** Tarjeta de métrica: icono, etiqueta, valor grande y subtexto. */
export function AdminStat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "blue",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hover-lift rounded-2xl border border-border/60 bg-card p-4 shadow-soft",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", statToneTile[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-1.5 font-display text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Estado vacío consistente: icono, título, descripción y acción opcional. */
export function AdminEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/70 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-display text-base font-bold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const badgeToneClasses: Record<BadgeTone, string> = {
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-400",
  info: "border-brand-500/25 bg-brand-500/10 text-brand-700 dark:text-brand-400",
  neutral: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-400",
  primary: "border-primary/25 bg-primary/10 text-primary",
};

/** Badge de estado consistente en todo el panel. */
export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        badgeToneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Contenedor de tabla con scroll horizontal en móvil y bordes redondeados.
 *  En el teléfono la primera columna queda FIJA a la izquierda (con fondo
 *  sólido y sombra de borde) pa que al desplazar lateralmente nunca se
 *  pierda de vista a qué fila pertenece cada dato; el scroll es suave.
 *  En escritorio no cambia nada. Las secciones con tarjetas móviles
 *  propias (Productos, Pedidos…) ni siquiera muestran la tabla en móvil. */
export function AdminTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-x-auto scroll-smooth rounded-2xl border border-border/60",
        "max-lg:[&_thead_th:first-child]:sticky max-lg:[&_thead_th:first-child]:left-0 max-lg:[&_thead_th:first-child]:z-20 max-lg:[&_thead_th:first-child]:bg-muted",
        "max-lg:[&_tbody_td:first-child]:sticky max-lg:[&_tbody_td:first-child]:left-0 max-lg:[&_tbody_td:first-child]:z-10 max-lg:[&_tbody_td:first-child]:bg-card max-lg:[&_tbody_td:first-child]:shadow-[10px_0_14px_-10px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <table className="w-full min-w-[640px] text-sm">{children}</table>
    </div>
  );
}

/** Clases compartidas para celdas de tabla del panel. */
export const adminTh =
  "whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
export const adminTd = "px-4 py-3 align-middle";
export const adminTr = "border-t border-border/60 transition-colors hover:bg-muted/40";

/** Encabezado de tabla con fondo sutil (usar dentro de <thead>). */
export function AdminTableHead({ children }: { children: ReactNode }) {
  return <thead className="bg-muted/50">{children}</thead>;
}

/** Barra de filtros: apilada en móvil, en fila desde sm. */
export function AdminFilters({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", className)}>{children}</div>;
}

/** Carga elegante para secciones del panel. */
export function AdminLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="animate-pulse text-sm">{label}</p>
    </div>
  );
}

/** Esqueleto de tabla: se usa SOLO en la primera carga, cuando aún no hay
 *  ningún dato que pintar (después la sección sirve la caché al instante). */
export function AdminTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60" aria-hidden>
      <div className="space-y-0">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="flex items-center gap-4 border-t border-border/60 px-4 py-3.5 first:border-t-0"
          >
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="h-4 animate-pulse rounded-md bg-muted"
                style={{ width: c === 0 ? "22%" : `${Math.max(8, 18 - c * 2)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Esqueleto de tarjetas de métricas (Resumen) para la primera carga. */
export function AdminStatsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="h-3 w-2/3 animate-pulse rounded-md bg-muted" />
          <div className="mt-3 h-7 w-1/2 animate-pulse rounded-md bg-muted" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

/** Indicador discreto de refresco en segundo plano (nunca bloquea). */
export function AdminRefreshing() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      Actualizando…
    </span>
  );
}

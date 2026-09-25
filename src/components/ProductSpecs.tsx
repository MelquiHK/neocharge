import { useMemo } from "react";
import { Check, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseSpecGroups } from "@/lib/product-specs";

interface ProductSpecsProps {
  specifications?: string | null;
  className?: string;
}

/**
 * Ficha técnica del producto: las líneas "Etiqueta: valor" se muestran
 * como tabla de definición y el resto como lista de verificación con un
 * solo icono por ítem. Soporta modo oscuro.
 */
export function ProductSpecs({ specifications, className }: ProductSpecsProps) {
  const groups = useMemo(() => parseSpecGroups(specifications), [specifications]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay especificaciones disponibles.</p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {groups.map((group, groupIndex) => (
        <section
          key={groupIndex}
          aria-label={group.title ?? "Especificaciones"}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950"
        >
          {group.title ? (
            <header className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800/70 dark:bg-slate-900/60">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ListChecks className="h-4 w-4" />
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {group.title}
              </h4>
            </header>
          ) : null}

          {group.rows.length > 0 ? (
            <dl className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {group.rows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  className="grid gap-0.5 px-5 py-3 transition-colors hover:bg-slate-50/80 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-4 dark:hover:bg-slate-900/50"
                >
                  <dt className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {row.label}
                  </dt>
                  <dd className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {group.bullets.length > 0 ? (
            <ul
              className={cn(
                "space-y-1 px-3 py-3",
                group.rows.length > 0 &&
                  "border-t border-slate-100 dark:border-slate-800/60"
              )}
            >
              {group.bullets.map((bullet, bulletIndex) => (
                <li
                  key={bulletIndex}
                  className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

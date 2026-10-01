import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** A partir de este stock (inclusive) se muestra la insignia "Últimas unidades". */
export const LOW_STOCK_THRESHOLD = 5;

interface LowStockBadgeProps {
  stock: number | null | undefined;
  className?: string;
}

/**
 * Insignia "¡Últimas unidades!" para productos con stock bajo.
 * No renderiza nada si el stock es 0 (agotado) o está por encima del umbral.
 */
export function LowStockBadge({ stock, className }: LowStockBadgeProps) {
  const qty = Number(stock ?? 0);
  if (qty <= 0 || qty > LOW_STOCK_THRESHOLD) return null;

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full glass border-brand-300/70 px-3 py-1",
        "text-xs font-bold text-brand-800",
        className
      )}
      role="status"
    >
      <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ¡Últimas unidades! Solo quedan {qty}
    </p>
  );
}

import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}

/**
 * Encabezado de sección premium y consistente:
 * eyebrow de vidrio + titular display + descripción ligera.
 */
export function SectionHeading({ eyebrow, title, description, align = "center", className }: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-4 mb-10 md:mb-14",
        align === "center" ? "text-center max-w-3xl mx-auto" : "max-w-2xl",
        className,
      )}
    >
      <span className="nc-eyebrow">
        <span className="nc-eyebrow-dot" />
        {eyebrow}
      </span>
      <h2 className="nc-display text-4xl md:text-5xl nc-title-premium">{title}</h2>
      {description && (
        <p className="text-slate-500 text-lg font-light leading-relaxed">{description}</p>
      )}
    </div>
  );
}

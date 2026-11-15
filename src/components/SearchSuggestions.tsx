import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import {
  loadProductIndex,
  searchProducts,
  type SearchProduct,
} from "@/lib/product-search";
import { computeDisplayPrice, formatCUP, formatPrice } from "@/lib/format";
import { responsiveImage } from "@/lib/responsive-image";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";

interface SearchSuggestionsProps {
  term: string;
  /** Se llamó a navegar (click en un producto): cerrar el buscador. */
  onNavigate: () => void;
  /** «Ver todos los resultados»: equivale a enviar el formulario. */
  onSeeAll: () => void;
}

/**
 * Sugerencias en vivo del buscador del Header: mientras el cliente
 * escribe, hasta 6 productos que coinciden, con foto y precio (el mismo
 * cálculo de las tarjetas). El índice se descarga una sola vez y solo
 * cuando el buscador se usa (ver loadProductIndex).
 */
export function SearchSuggestions({ term, onNavigate, onSeeAll }: SearchSuggestionsProps) {
  const [results, setResults] = useState<SearchProduct[] | null>(null);
  const [failed, setFailed] = useState(false);
  const { rate } = useExchangeRate();
  const q = term.trim();

  useEffect(() => {
    if (q.length < 2) {
      setResults(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    // Pequeña espera: no buscar por cada tecla si el cliente sigue
    // escribiendo (el índice ya está en memoria, es solo cortesía).
    const t = setTimeout(() => {
      loadProductIndex()
        .then((index) => {
          if (!cancelled) {
            setResults(searchProducts(index, q, 6));
            setFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setFailed(true);
          }
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  if (q.length < 2 || results === null) return null;

  return (
    <div
      className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(92vw,380px)] glass rounded-3xl shadow-xl shadow-brand-500/10 border border-white/60 p-2 animate-fade-in"
      role="listbox"
      aria-label="Sugerencias de productos"
    >
      {results.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">
          {failed ? (
            <>No se pudieron cargar las sugerencias. Pulsa Enter para buscar «{q}».</>
          ) : (
            <>
              Sin coincidencias para «<span className="font-semibold text-foreground">{q}</span>».
              Prueba con «cargador», «batería» o el voltaje que buscas.
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col">
          {results.map((p) => {
            const display = computeDisplayPrice(p, rate);
            const img = Array.isArray(p.images) ? p.images[0] : undefined;
            const ri = img ? responsiveImage(img, "48px") : null;
            const out = p.stock != null && p.stock <= 0;
            return (
              <li key={p.id}>
                <Link
                  to={`/producto/${encodeURIComponent(p.slug)}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-brand-50 active:bg-brand-100 transition-colors"
                  role="option"
                  aria-selected="false"
                >
                  <span className="w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shrink-0 flex items-center justify-center">
                    {ri ? (
                      <img
                        src={ri.src}
                        srcSet={ri.srcSet}
                        sizes={ri.sizes}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <Search className="w-4 h-4 text-muted-foreground" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold leading-tight truncate">
                      {p.name}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {out ? (
                        <span className="text-destructive font-semibold">Agotado</span>
                      ) : display.primary === "USD" ? (
                        <>
                          {display.usd != null ? formatPrice(display.usd) : ""}
                          {display.cup != null && (
                            <span className="opacity-80"> · ≈ {formatCUP(display.cup)}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {display.cup != null ? formatCUP(display.cup) : ""}
                          {display.usd != null && (
                            <span className="opacity-80"> · ≈ {formatPrice(display.usd)}</span>
                          )}
                        </>
                      )}
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={onSeeAll}
        className={cn(
          "mt-1 w-full flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5",
          "text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 active:scale-[0.99] transition-all",
        )}
      >
        <Search className="w-4 h-4" />
        Ver todos los resultados para «{q}»
      </button>
    </div>
  );
}

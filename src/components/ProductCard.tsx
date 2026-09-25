import { Link } from "react-router-dom";
import { ShoppingBag, Check, Heart } from "lucide-react";
import { memo, useState, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatPrice, formatCUP, formatMoney, computeDisplayPrice, hasSaneDiscount } from "@/lib/format";
import { responsiveImage } from "@/lib/responsive-image";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { cn } from "@/lib/utils";
import { flyToCart, ensureNcFx } from "@/lib/fly-to-cart";
import { toast } from "sonner";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  variant?: "default" | "featured";
  isFavorite?: boolean;
  onToggleFavorite?: (event: MouseEvent<HTMLButtonElement>) => void;
}

function ProductCardComponent({ product, variant = "default", isFavorite: propIsFavorite, onToggleFavorite: propOnToggleFavorite }: ProductCardProps) {
  const { addItem } = useCart();
  const { rate } = useExchangeRate();
  const { isFavorite: checkFavorite, toggleFavorite } = useUnifiedFavorites();

  const isFavorite = propIsFavorite ?? checkFavorite(product.id);

  const [added, setAdded] = useState(false);
  const images = Array.isArray(product.images) ? product.images : [];
  const display = computeDisplayPrice(product, rate);
  const mainImage = images[product.main_image_index ?? 0] ?? images[0];
  const hoverImage = images[product.main_image_index === 0 ? 1 : 0] ?? images[1];
  const productLink = `/producto/${encodeURIComponent(product.slug)}`;
  // El "precio anterior" solo se muestra si el descuento es creíble: un
  // compare_price absurdo (>90% de descuento) es un dato mal cargado y no
  // debe verse como "-97%".
  const showCompare = hasSaneDiscount(product.price, product.compare_price);
  const discount = showCompare
    ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100)
    : null;

  const handleToggleFavorite = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    ensureNcFx();
    if (propOnToggleFavorite) {
      propOnToggleFavorite(e);
    } else {
      toggleFavorite(product.id);
    }
  };

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      price_cup: product.price_cup,
      extra_cup_per_usd: product.extra_cup_per_usd,
      warranty_type: product.warranty_type,
      image: mainImage,
      stock: product.stock,
    });
    flyToCart(e.currentTarget, mainImage);
    toast.success(`${product.name} añadido al carrito`, {
      description: display.primary === "USD" && display.usd != null
        ? formatPrice(display.usd)
        : display.cup != null ? formatCUP(display.cup) : undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const outOfStock = product.stock <= 0;

  return (
    <div
      className={cn(
        "group relative rounded-3xl overflow-hidden transition-all duration-700 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/30 hover:shadow-2xl dark:hover:shadow-primary/5 hover:-translate-y-3 flex flex-col h-full",
        variant === "featured" && "lg:col-span-2",
      )}
    >
      <div className="relative flex flex-col flex-1">
        {/* Image — el botón de favorito ya no va sobre la foto */}
        <div className="relative">
          <Link to={productLink} className="block" aria-label={product.name}>
            <div className={cn(
              "relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700",
              product.is_featured && "nc-water-shine",
            )}>
              {/* Reflejo suave estático tipo "agua" sobre la foto */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/20 via-white/5 to-transparent dark:from-white/10 pointer-events-none z-[5]" />
              {/* Animated background glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
              </div>

              {/* Main Image */}
              {mainImage && (() => {
                const ri = responsiveImage(mainImage, "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px");
                return (
                  <img
                    src={ri.src}
                    srcSet={ri.srcSet}
                    sizes={ri.sizes}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover transition-all duration-700",
                      "group-hover:scale-120",
                      hoverImage && "group-hover:opacity-0",
                    )}
                  />
                );
              })()}

              {/* Hover Image */}
              {hoverImage && (() => {
                const ri = responsiveImage(hoverImage, "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px");
                return (
                  <img
                    src={ri.src}
                    srcSet={ri.srcSet}
                    sizes={ri.sizes}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 scale-110"
                  />
                );
              })()}

              {/* Top Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
                {discount && (
                  <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold shadow-lifted animate-bounce-in">
                    -{discount}%
                  </div>
                )}
                {product.is_featured && !discount && (
                  <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold shadow-lifted animate-bounce-in">
                    ⭐ Destacado
                  </div>
                )}
              </div>

              {/* Out of Stock Overlay */}
              {outOfStock && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent backdrop-blur-sm flex items-center justify-center z-20">
                  <div className="text-center space-y-2">
                    <p className="text-white font-display font-bold text-xl">Agotado</p>
                    <p className="text-white/80 text-sm">Próximamente disponible</p>
                  </div>
                </div>
              )}
            </div>
          </Link>

          {/* Quick Add Button — visible en táctil, revelado en hover en escritorio */}
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/50 nc-liquid-soft p-2 translate-y-[130%] group-hover:translate-y-0 [@media(hover:none)]:translate-y-0 transition-transform duration-500 z-30 pointer-events-auto shadow-xl">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              className={cn(
                "w-full font-bold rounded-2xl shadow-xl relative overflow-hidden h-12 active:scale-[0.98] transition-transform",
                !added && "nc-btn-shine",
                added
                  ? "bg-green-500 text-white"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              {added ? (
                <span className="flex items-center justify-center gap-2 animate-bounce-in">
                  <Check className="w-4 h-4" /> ¡Añadido!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShoppingBag className="w-4 h-4" /> Añadir al carrito
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Content Section — flex column para igualar alturas entre cards */}
        <div className="p-4 flex flex-col flex-1 gap-3">
          {/* Title + favorite (fuera de la foto) */}
          <div className="flex items-start gap-2">
            <Link to={productLink} className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">
                {product.name}
              </h3>
            </Link>
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
              aria-pressed={isFavorite}
              className={cn(
                "shrink-0 p-2 rounded-xl bg-secondary/70 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all duration-300 hover:scale-110 active:scale-95",
                isFavorite && "shadow-soft",
              )}
            >
              <Heart
                key={String(isFavorite)}
                style={isFavorite ? { animation: "nc-heart-pop 0.45s ease" } : undefined}
                className={cn(
                  "w-5 h-5 transition-colors duration-300",
                  isFavorite ? "fill-red-500 text-red-500" : "text-slate-400 dark:text-slate-300"
                )}
              />
            </button>
          </div>

          {/* Price Section — mt-auto la pega al fondo para parejar las cards */}
          <div className="space-y-1.5 mt-auto">
            <div className="flex items-baseline gap-2 flex-wrap">
              {display.primary === "USD" ? (
                <span className="text-xl font-display font-bold text-gray-900 dark:text-white">
                  {formatPrice(display.usd!)}
                </span>
              ) : (
                <span className="text-xl font-display font-bold text-gray-900 dark:text-white">
                  {formatCUP(display.cup!)}
                </span>
              )}
              {showCompare && (
                <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                  {formatMoney(product.compare_price!, product.currency)}
                </span>
              )}
            </div>
            {display.primary === "USD" && display.cup != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">≈ {formatCUP(display.cup)}</p>
            )}
          </div>

          {/* Stock Warning */}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="p-2 rounded-lg bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 border border-orange-300 dark:border-orange-700/50">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                ⚠️ Solo quedan {product.stock} en stock
              </p>
            </div>
          )}

          {/* Stock Indicator con etiqueta */}
          {product.stock > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Stock disponible</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-bold tabular-nums">
                  {product.stock}
                </span>
              </div>
              <div
                className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                role="progressbar"
                aria-label={`Stock disponible: ${product.stock}`}
                aria-valuenow={product.stock}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                  style={{
                    width: `${Math.min((product.stock / 100) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardComponent);
export type { Product };

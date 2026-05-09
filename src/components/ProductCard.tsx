import { Link } from "react-router-dom";
import { ShoppingBag, Check, Heart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, formatCUP, computeDisplayPrice } from "@/lib/format";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  variant?: "default" | "featured";
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const { rate } = useExchangeRate();
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const display = computeDisplayPrice(product, rate);
  const mainImage = product.images?.[product.main_image_index || 0];
  const hoverImage = product.images?.[product.main_image_index === 0 ? 1 : 0];
  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : null;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: mainImage,
      stock: product.stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const outOfStock = product.stock <= 0;

  return (
    <Link
      to={`/producto/${product.slug}`}
      className={cn(
        "group relative block rounded-2xl overflow-hidden transition-all duration-500",
        "bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800",
        "border border-slate-200 dark:border-slate-700",
        "hover:border-blue-400 dark:hover:border-blue-500",
        "hover:shadow-lifted dark:hover:shadow-card-hover",
        "hover:-translate-y-2",
        variant === "featured" && "lg:col-span-2",
      )}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
        {/* Animated background glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
        </div>

        {/* Main Image */}
        {mainImage && (
          <img
            src={mainImage}
            alt={product.name}
            loading="lazy"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all duration-700",
              "group-hover:scale-120",
              hoverImage && "group-hover:opacity-0",
            )}
          />
        )}

        {/* Hover Image */}
        {hoverImage && (
          <img
            src={hoverImage}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 scale-110"
          />
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <div className="flex flex-col gap-2">
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

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked(!liked);
            }}
            className="p-2 rounded-lg backdrop-blur-md bg-white/80 dark:bg-slate-800/80 border border-white/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 hover:scale-110"
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-colors duration-300",
                liked ? "fill-red-500 text-red-500" : "text-slate-400 dark:text-slate-300"
              )}
            />
          </button>
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

        {/* Quick Add Button */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
          <Button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className={cn(
              "w-full font-semibold rounded-lg shadow-lifted relative overflow-hidden",
              added 
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" 
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
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

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Product Name */}
        <h3 className="font-display font-bold text-base leading-tight text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
          {product.name}
        </h3>

        {/* Price Section */}
        <div className="space-y-1.5">
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
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                {formatPrice(product.compare_price)}
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

        {/* Stock Indicator */}
        {product.stock > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{
                  width: `${Math.min((product.stock / 100) * 100, 100)}%`,
                }}
              ></div>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {product.stock}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
    </Link>
  );
}

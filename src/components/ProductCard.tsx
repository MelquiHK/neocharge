import { Link } from "react-router-dom";
import { ShoppingBag, Check, Heart } from "lucide-react";
import { memo, useState } from "react";
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

function ProductCardComponent({ product, variant = "default" }: ProductCardProps) {
  const { addItem } = useCart();
  const { rate } = useExchangeRate();
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const images = Array.isArray(product.images) ? product.images : [];
  const display = computeDisplayPrice(product, rate);
  const mainImage = images[product.main_image_index ?? 0] ?? images[0];
  const hoverImage = images[product.main_image_index === 0 ? 1 : 0] ?? images[1];
  const productLink = `/producto/${encodeURIComponent(product.slug)}`;
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
      currency: product.currency,
      price_cup: product.price_cup,
      extra_cup_per_usd: product.extra_cup_per_usd,
      warranty_type: product.warranty_type,
      image: mainImage,
      stock: product.stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const outOfStock = product.stock <= 0;

  return (
    <div
      className={cn(
        "group relative rounded-3xl overflow-hidden transition-all duration-700 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/30 hover:shadow-2xl dark:hover:shadow-primary/5 hover:-translate-y-3",
        variant === "featured" && "lg:col-span-2",
      )}
    >
      <Link to={productLink} className="block h-full">
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
              decoding="async"
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
              decoding="async"
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
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Product Name */}
          <h3 className="font-display font-bold text-lg leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">
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

      {/* Quick Add Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-30 pointer-events-auto">
        <Button
          type="button"
          onClick={handleAdd}
          disabled={outOfStock}
          className={cn(
            "w-full font-bold rounded-2xl shadow-xl relative overflow-hidden h-12",
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
  );
}

export const ProductCard = memo(ProductCardComponent);

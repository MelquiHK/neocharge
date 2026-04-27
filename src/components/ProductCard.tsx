import { Link } from "react-router-dom";
import { ShoppingBag, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, formatCUP, computeDisplayPrice } from "@/lib/format";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  images: string[];
  main_image_index: number;
  stock: number;
  is_featured: boolean;
  currency?: string | null;
  price_cup?: number | null;
  extra_cup_per_usd?: number | null;
  warranty_type?: string | null;
}

interface ProductCardProps {
  product: Product;
  variant?: "default" | "featured";
}

export function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const { rate } = useExchangeRate();
  const [added, setAdded] = useState(false);
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
        "group relative block rounded-3xl bg-card border border-border overflow-hidden transition-all duration-500 hover:border-primary/40 hover:shadow-lifted hover:-translate-y-1",
        variant === "featured" && "lg:col-span-2",
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary/50 to-secondary">
        {/* Glow */}
        <div className="absolute inset-0 bg-radial-glow opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        {mainImage && (
          <img
            src={mainImage}
            alt={product.name}
            loading="lazy"
            className={cn(
              "absolute inset-0 w-full h-full object-contain p-8 transition-all duration-700",
              "group-hover:scale-110",
              hoverImage && "group-hover:opacity-0",
            )}
          />
        )}
        {hoverImage && (
          <img
            src={hoverImage}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-700 scale-105"
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {discount && (
            <span className="px-2.5 py-1 rounded-full bg-gradient-accent text-accent-foreground text-[11px] font-bold shadow-soft">
              -{discount}%
            </span>
          )}
          {product.is_featured && !discount && (
            <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-soft">
              Destacado
            </span>
          )}
        </div>

        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
            <span className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold">
              Agotado
            </span>
          </div>
        )}

        {/* Quick add */}
        <div className="absolute bottom-3 right-3 left-3 flex justify-end">
          <Button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            size="sm"
            variant={added ? "electric" : "default"}
            className="translate-y-12 group-hover:translate-y-0 transition-transform duration-500 shadow-lifted"
          >
            {added ? (
              <>
                <Check className="w-4 h-4" /> Añadido
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" /> Añadir
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-display font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="mt-2 space-y-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            {display.primary === "USD" ? (
              <span className="text-lg font-bold text-foreground">{formatPrice(display.usd!)}</span>
            ) : (
              <span className="text-lg font-bold text-foreground">{formatCUP(display.cup!)}</span>
            )}
            {product.compare_price && product.compare_price > product.price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_price)}
              </span>
            )}
          </div>
          {display.primary === "USD" && display.cup != null && (
            <p className="text-xs text-muted-foreground">≈ {formatCUP(display.cup)}</p>
          )}
        </div>
        {product.stock > 0 && product.stock <= 5 && (
          <p className="text-xs text-warning font-medium mt-1.5">
            Solo quedan {product.stock} en stock
          </p>
        )}
      </div>
    </Link>
  );
}

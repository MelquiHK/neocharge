import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Check, Truck, ShieldCheck, Minus, Plus, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice, formatCUP, computeDisplayPrice } from "@/lib/format";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { cn } from "@/lib/utils";
import { Product } from "@/types";

interface LocStock {
  stock: number;
  store_locations: {
    id: string;
    name: string;
    address: string;
    location_type: string;
    map_link: string | null;
    hours: string | null;
  } | null;
}

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, openCart } = useCart();
  const { rate } = useExchangeRate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [locStock, setLocStock] = useState<LocStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,currency,price_cup,extra_cup_per_usd,warranty_type,description,specifications,category_id,cost_price,low_stock_threshold")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (data) {
        const productData = data as Product;
        setProduct(productData);
        setActiveImage(productData.main_image_index ?? 0);
        document.title = `${productData.name} — Neocharge`;

        // Stock por local
        const { data: ls } = await supabase
          .from("product_locations")
          .select("stock, store_locations(id,name,address,location_type,map_link,hours)")
          .eq("product_id", data.id);
        if (ls) setLocStock(ls as any);

        // Related
        if (data.category_id) {
          const { data: rel } = await supabase
            .from("products")
            .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,category_id,description,specifications,currency,price_cup,extra_cup_per_usd,warranty_type")
            .eq("is_active", true)
            .eq("category_id", data.category_id)
            .neq("id", data.id)
            .limit(4);
          if (rel) setRelated(rel as Product[]);
        }
      }
      setLoading(false);
    };
    load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="aspect-square rounded-3xl bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-6 bg-muted rounded animate-pulse w-1/4" />
            <div className="h-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold">Producto no encontrado</h1>
        <p className="text-muted-foreground">El producto que buscas no existe o ya no está disponible.</p>
        <Button asChild>
          <Link to="/tienda"><ArrowLeft className="w-4 h-4" /> Volver a la tienda</Link>
        </Button>
      </div>
    );
  }

  const discount =
    product.compare_price && product.compare_price > product.price
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : null;
  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image: product.images?.[product.main_image_index || 0],
      stock: product.stock,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => navigate("/checkout"), 200);
  };

  return (
    <div className="container-page py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to="/" className="hover:text-primary transition-colors">Inicio</Link>
        <span>/</span>
        <Link to="/tienda" className="hover:text-primary transition-colors">Tienda</Link>
        <span>/</span>
        <span className="text-foreground truncate">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12 mb-20">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-secondary/60 to-secondary border border-border">
            <div className="absolute inset-0 bg-radial-glow" />
            {product.images[activeImage] && (
              <img
                src={product.images[activeImage]}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover animate-scale-in"
                key={activeImage}
              />
            )}
            {discount && (
              <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-gradient-accent text-accent-foreground text-sm font-bold shadow-soft">
                -{discount}%
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    activeImage === i
                      ? "border-primary shadow-soft"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover bg-secondary/40" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight mb-3">
              {product.name}
            </h1>
            {(() => {
              const display = computeDisplayPrice(product, rate);
              return (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-4xl font-display font-bold text-primary">
                      {display.primary === "USD" ? formatPrice(display.usd!) : formatCUP(display.cup!)}
                    </span>
                    {product.compare_price && product.compare_price > product.price && (
                      <span className="text-xl text-muted-foreground line-through">
                        {formatPrice(product.compare_price)}
                      </span>
                    )}
                  </div>
                  {display.primary === "USD" && display.cup != null && (
                    <p className="text-sm text-muted-foreground">
                      ≈ <span className="font-semibold text-foreground">{formatCUP(display.cup)}</span>
                      {rate && <span className="ml-1 text-xs">(tasa hoy: 1 USD = {rate.usd_to_cup} CUP{product.warranty_type === "charger" ? ` + ${rate.extra_cup_chargers}` : ""})</span>}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          {product.description && (
            <p className="text-foreground/80 leading-relaxed text-base">{product.description}</p>
          )}

          {/* Stock indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                outOfStock ? "bg-destructive" : product.stock <= 5 ? "bg-warning" : "bg-success",
              )}
            />
            <span className="font-medium">
              {outOfStock
                ? "Sin stock"
                : product.stock <= 5
                ? `Solo quedan ${product.stock} unidades`
                : "Disponible"}
            </span>
          </div>

          {/* Quantity + Add */}
          {!outOfStock && (
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="flex items-center border-2 border-border rounded-full">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-l-full transition-colors"
                  aria-label="Disminuir"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-display font-bold text-lg tabular-nums">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-secondary rounded-r-full transition-colors"
                  aria-label="Aumentar"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button onClick={handleAddToCart} variant={added ? "electric" : "default"} size="lg" className="flex-1">
                {added ? <><Check className="w-4 h-4" /> Añadido</> : <><ShoppingBag className="w-4 h-4" /> Añadir al carrito</>}
              </Button>
              <Button onClick={handleBuyNow} variant="hero" size="lg" className="flex-1">
                Comprar ahora
              </Button>
            </div>
          )}

          {outOfStock && (
            <Button asChild variant="whatsapp" size="lg" className="w-full">
              <a
                href={`https://wa.me/5363180910?text=${encodeURIComponent(`Hola, me interesa saber cuándo vuelve a estar disponible: ${product.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-4 h-4" /> Avísame cuando vuelva
              </a>
            </Button>
          )}

          {/* Disponibilidad por local */}
          {locStock.filter((l) => l.store_locations).length > 0 && (
            <div className="pt-6 border-t border-border space-y-3">
              <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" /> Disponible en estos locales
              </h2>
              <div className="grid gap-2">
                {locStock
                  .filter((l) => l.store_locations)
                  .map((l, i) => {
                    const loc = l.store_locations!;
                    const has = l.stock > 0;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-xl border-2 p-3 text-sm",
                          has ? "border-success/30 bg-success/5" : "border-border bg-muted/30 opacity-70",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", has ? "bg-success" : "bg-muted-foreground")} />
                            {loc.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{loc.address}</p>
                          {loc.hours && <p className="text-xs text-muted-foreground">🕐 {loc.hours}</p>}
                          {loc.map_link && (
                            <a
                              href={loc.map_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              Ver en mapa →
                            </a>
                          )}
                        </div>
                        <span className={cn("text-xs font-bold whitespace-nowrap", has ? "text-success" : "text-muted-foreground")}>
                          {has ? `${l.stock} en stock` : "Sin stock"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Trust */}
          <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border">
            <div className="flex items-center gap-2.5 text-sm">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <span><strong>Garantía 24 horas para su prueba</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Truck className="w-5 h-5 text-primary shrink-0" />
              <span><strong>Entrega 24h</strong> en La Habana</span>
            </div>
          </div>

          {/* Specs */}
          {product.specifications && (
            <div className="pt-6 border-t border-border">
              <h2 className="font-display font-bold text-lg mb-3">Especificaciones técnicas</h2>
              <div className="bg-secondary/50 rounded-2xl p-5 whitespace-pre-line text-sm text-foreground/80 leading-relaxed font-mono">
                {product.specifications}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border pt-16">
          <h2 className="font-display text-3xl font-bold mb-8">También te puede gustar</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;

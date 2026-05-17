import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Share2, ArrowLeft, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

interface LocationStock {
  stock: number;
  store_locations: {
    id: string;
    name: string;
    address: string;
    location_type: string;
    map_link: string | null;
    hours: string | null;
  };
}

const computeDisplayPrice = (product: Product, rate: number) => {
  const usd = product.price || 0;
  const cup = product.price_cup || usd * rate;
  const primary = product.currency === "CUP" ? ("CUP" as const) : ("USD" as const);
  return { usd, cup, primary };
};

export function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { rate } = useExchangeRate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [locStock, setLocStock] = useState<LocationStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading product:", error);
          setLoadError("No pudimos cargar el producto. Intenta de nuevo más tarde.");
          setProduct(null);
          setRelated([]);
          setLocStock([]);
          return;
        }

        if (!data) {
          setLoadError("Producto no encontrado.");
          setProduct(null);
          setRelated([]);
          setLocStock([]);
          return;
        }

        const productData = data as Product;
        setProduct(productData);
        setActiveImage(productData.main_image_index ?? 0);
        document.title = `${productData.name} — NeoCharge`;

        const { data: ls, error: locError } = await supabase
          .from("product_locations")
          .select("stock, store_locations(id,name,address,location_type,map_link,hours)")
          .eq("product_id", data.id);
        if (locError) console.error("Location stock error:", locError);
        if (ls) setLocStock(ls as any);

        if (data.category_id) {
          const { data: rel, error: relError } = await supabase
            .from("products")
            .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,category_id,description,specifications,currency,price_cup,extra_cup_per_usd,warranty_type")
            .eq("is_active", true)
            .eq("category_id", data.category_id)
            .neq("id", data.id)
            .limit(4);
          if (relError) console.error("Related products error:", relError);
          if (rel) setRelated(rel as Product[]);
        }
      } catch (err) {
        console.error("ProductDetail error:", err);
        setLoadError("Ocurrió un error al cargar el producto. Intenta de nuevo.");
        setProduct(null);
        setRelated([]);
        setLocStock([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  // Compute display price BEFORE any early returns
  const display = useMemo(() => {
    if (!product) {
      return { usd: 0, cup: 0, primary: "USD" as const };
    }
    try {
      return computeDisplayPrice(product, rate);
    } catch (formatError) {
      console.error("ComputeDisplayPrice error:", formatError);
      return { usd: 0, cup: 0, primary: "USD" as const };
    }
  }, [product, rate]);

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

  if (loadError) {
    return (
      <div className="container-page py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold">Ocurrió un problema</h1>
        <p className="text-muted-foreground">{loadError}</p>
        <Button asChild>
          <Link to="/tienda"><ArrowLeft className="w-4 h-4" /> Volver a la tienda</Link>
        </Button>
      </div>
    );
  }

  const images = Array.isArray(product?.images) ? product.images : [];
  const display = useMemo(() => {
    if (!product) {
      return { usd: 0, cup: 0, primary: "USD" as const };
    }
    try {
      return computeDisplayPrice(product, rate);
    } catch (formatError) {
      console.error("ComputeDisplayPrice error:", formatError);
      return { usd: 0, cup: 0, primary: "USD" as const };
    }
  }, [product, rate]);
  const mainImage = images[product?.main_image_index ?? 0];
  const discount =
    product?.compare_price && product.compare_price > product.price
      ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
      : null;
  const outOfStock = (product?.stock ?? 0) <= 0;

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
  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      quantity,
      image: mainImage,
    });
    toast.success(`${quantity} ${product.name} agregado al carrito`);
    setQuantity(1);
  };

  return (
    <div className="container-page py-12">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link to="/tienda" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver a la tienda
        </Link>
      </div>

      {/* Main Product Section */}
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Sin imagen
              </div>
            )}
            {discount && (
              <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold">
                -{discount}%
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    activeImage === idx ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">{product.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                ⭐ 4.9 (127 reseñas)
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold">
                {display.primary === "USD" ? `$${display.usd.toFixed(2)}` : `${display.cup.toLocaleString()} CUP`}
              </span>
              {product.compare_price && (
                <span className="text-lg text-muted-foreground line-through">
                  ${product.compare_price.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {display.primary === "USD" ? `≈ ${display.cup.toLocaleString()} CUP` : `≈ $${display.usd.toFixed(2)} USD`}
            </p>
          </div>

          {/* Stock Status */}
          <div className={`text-sm font-semibold ${outOfStock ? "text-destructive" : "text-green-600"}`}>
            {outOfStock ? "Agotado" : `${product.stock} disponibles`}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}

          {/* Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-muted"
                >
                  −
                </button>
                <span className="px-6 py-2 border-l border-r">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-2 hover:bg-muted"
                  disabled={quantity >= product.stock}
                >
                  +
                </button>
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="w-full h-12 text-base"
            >
              {outOfStock ? "Agotado" : "Añadir al carrito"}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setLiked(!liked)}
                className="w-12 h-12"
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-current text-destructive" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.share?.({
                    title: product.name,
                    text: product.description || "",
                    url: window.location.href,
                  });
                }}
                className="w-12 h-12"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Warranty */}
          {product.warranty_type && (
            <div className="bg-primary/10 rounded-lg p-4 text-sm">
              <p className="font-semibold text-primary mb-1">✓ Garantía: {product.warranty_type}</p>
              <p className="text-muted-foreground">Todos nuestros productos incluyen garantía completa y soporte técnico.</p>
            </div>
          )}
        </div>
      </div>

      {/* Specifications & Locations */}
      <Tabs defaultValue="specs" className="mb-16">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="specs">Especificaciones</TabsTrigger>
          <TabsTrigger value="locations">Disponibilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="specs" className="space-y-4 mt-6">
          {product.specifications ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p>{product.specifications}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">No hay especificaciones disponibles.</p>
          )}
        </TabsContent>

        <TabsContent value="locations" className="space-y-4 mt-6">
          {locStock.length > 0 ? (
            <div className="grid gap-4">
              {locStock.map((loc) => (
                <div key={loc.store_locations.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{loc.store_locations.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        {loc.store_locations.address}
                      </div>
                      {loc.store_locations.hours && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="w-4 h-4" />
                          {loc.store_locations.hours}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{loc.stock} en stock</p>
                    </div>
                  </div>
                  {loc.store_locations.map_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="mt-2"
                    >
                      <a href={loc.store_locations.map_link} target="_blank" rel="noopener noreferrer">
                        Ver en mapa
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay información de disponibilidad en locales.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Productos relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((prod) => (
              <Link key={prod.id} to={`/producto/${prod.slug}`} className="group">
                <div className="aspect-square rounded-2xl overflow-hidden bg-muted mb-3 relative">
                  {prod.images?.[0] && (
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {prod.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ${prod.price?.toFixed(2) || "N/A"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

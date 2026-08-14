import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useSEO } from "@/hooks/use-seo";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { Product } from "@/types";
import { computeDisplayPrice, formatPrice, formatCUP } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Share2, ArrowLeft, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { ChargerCalculator } from "@/components/ChargerCalculator";

interface LocationStock {
  location_id: string;
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

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { rate: exchangeRate } = useExchangeRate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [chargerOptions, setChargerOptions] = useState<Product[]>([]);
  const [locStock, setLocStock] = useState<LocationStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  
  const { isFavorite, toggleFavorite } = useUnifiedFavorites();
  const liked = product ? isFavorite(product.id) : false;


  useEffect(() => {
    const load = async () => {
      try {
        if (!slug) {
          setLoadError("Producto no encontrado.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setLoadError(null);
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
          .select("location_id, stock, store_locations(id,name,address,location_type,map_link,hours)")
          .eq("product_id", data.id);
        if (locError) console.error("Location stock error:", locError);
        if (ls) setLocStock(ls as any);

        const { data: chargers, error: chargerError } = await supabase
          .from("products")
          .select("id,name,slug,price,currency,price_cup,extra_cup_per_usd,warranty_type,specifications,images,main_image_index,stock")
          .eq("is_active", true)
          .eq("warranty_type", "charger")
          .order("created_at", { ascending: false })
          .limit(24);
        if (chargerError) console.error("Charger products error:", chargerError);
        if (chargers) setChargerOptions(chargers as Product[]);

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

  const images = Array.isArray(product?.images) ? product.images : [];
  const mainImage = images[activeImage] ?? images[0] ?? "/images/og-home.jpg";

  useSEO("productDetail", {
    title: product ? `${product.name} — NeoCharge` : "Producto — NeoCharge",
    description: product?.description,
    ogImage: mainImage,
  });

  const display = useMemo(() => {
    if (!product) {
      return { usd: 0, cup: 0, primary: "USD" as const };
    }
    try {
      return computeDisplayPrice(product, exchangeRate);
    } catch (formatError) {
      console.error("ComputeDisplayPrice error:", formatError);
      return { usd: 0, cup: 0, primary: "USD" as const };
    }
  }, [product, exchangeRate]);
  const discount =
    Number(product?.compare_price ?? 0) > Number(product?.price ?? 0)
      ? Math.round(((Number(product.compare_price ?? 0) - Number(product.price ?? 0)) / Number(product.compare_price ?? 0)) * 100)
      : null;
  const outOfStock = Number(product?.stock ?? 0) <= 0;

  const handleShare = async () => {
    if (!product) return;

    const shareData: ShareData = {
      title: product.name,
      text: `${product.name} - ${display.primary === "USD" ? formatPrice(display.usd) : formatCUP(display.cup)}\n${product.description || ''}\n¡Mira este producto en NeoCharge!`, // Richer text
      url: window.location.href,
    };

    // Attempt to add main product image if available
    const mainImage = product.images?.[product.main_image_index ?? 0] ?? product.images?.[0];
    if (mainImage) {
      try {
        const response = await fetch(mainImage);
        const blob = await response.blob();
        const file = new File([blob], `${product.slug}.jpg`, { type: blob.type });
        shareData.files = [file];
      } catch (error) {
        console.error("Error al cargar la imagen para compartir:", error);
        // Fallback to sharing without image if image loading fails
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error("Error compartiendo:", error);
        if ((error as any).name !== "AbortError") {
          // Only show toast if not cancelled by user
          await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
          toast.success("¡Detalles y enlace del producto copiados al portapapeles!");
        }
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      toast.success("¡Detalles y enlace del producto copiados al portapapeles!");
    } else {
      toast.error("Tu navegador no soporta la función de compartir.");
    }
  };

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
      price: Number(product.price),
      currency: product.currency,
      price_cup: product.price_cup ? Number(product.price_cup) : undefined,
      extra_cup_per_usd: product.extra_cup_per_usd ? Number(product.extra_cup_per_usd) : undefined,
      warranty_type: product.warranty_type,
      image: mainImage,
      quantity,
      stock: Number(product.stock ?? 0),
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
                {display.primary === "USD" ? formatPrice(display.usd) : formatCUP(display.cup)}
              </span>
              {product.compare_price && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(Number(product.compare_price))}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {display.primary === "USD" ? `≈ ${formatCUP(display.cup)}` : `≈ ${formatPrice(display.usd)} USD`}
            </p>
          </div>

          {/* Stock Status */}
          <div className={`text-sm font-semibold ${outOfStock ? "text-destructive" : "text-green-600"}`}>
            {outOfStock ? "Agotado" : `${product.stock} disponibles`}
          </div>

          {/* Description */}
          {product.description && (
            <div className="bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-900/30 rounded-lg p-5 border border-blue-100 dark:border-blue-900/30">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Descripción</h3>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
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
                onClick={() => product && toggleFavorite(product.id)}
                className="w-12 h-12"
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-current text-destructive" : ""}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
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

      <div className="grid gap-10 lg:grid-cols-[1.35fr_0.8fr] mb-16">
        {product.warranty_type === "charger" ? (
          <div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/80">
              <h2 className="font-display text-2xl font-bold mb-3">Calculadora de cargador</h2>
              <p className="text-sm text-muted-foreground mb-4">Comprueba si este cargador sirve para tu batería y obtén recomendaciones de voltaje y amperaje.</p>
              <ChargerCalculator
                productName={product.name}
                productSpecs={product.specifications}
                availableChargers={chargerOptions}
              />
            </div>
          </div>
        ) : null}
        <div>
          <Tabs defaultValue="specs" className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="specs">Especificaciones</TabsTrigger>
              <TabsTrigger value="locations">Disponibilidad</TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="space-y-4 mt-6">
              {product.specifications ? (
                <div className="space-y-4">
                  {/* Parse specifications if JSON, otherwise display formatted */}
                  {(() => {
                    try {
                      const specs = JSON.parse(product.specifications);
                      if (Array.isArray(specs)) {
                        return (
                          <div className="grid gap-4">
                            {specs.map((spec, idx) => (
                              <div key={idx} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 hover:shadow-sm transition-shadow">
                                {typeof spec === 'object' && spec !== null ? (
                                  <>
                                    {spec.title && <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{spec.title}</h4>}
                                    {spec.items && Array.isArray(spec.items) ? (
                                      <ul className="space-y-2">
                                        {spec.items.map((item, i) => (
                                          <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-300">
                                            <span className="text-blue-500 font-bold">•</span>
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : spec.value ? (
                                      <p className="text-slate-700 dark:text-slate-300">{spec.value}</p>
                                    ) : null}
                                  </>
                                ) : (
                                  <p className="text-slate-700 dark:text-slate-300">{spec}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      } else if (typeof specs === 'object') {
                        return (
                          <div className="space-y-3">
                            {Object.entries(specs).map(([key, value], idx) => (
                              <div key={idx} className="border-b pb-3 last:border-b-0">
                                <p className="font-semibold text-slate-900 dark:text-white mb-1">{key}</p>
                                <p className="text-slate-700 dark:text-slate-300">{String(value)}</p>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return <p className="text-slate-700 dark:text-slate-300">{product.specifications}</p>;
                    } catch {
                      // Not JSON, display as formatted text
                      const lines = product.specifications.split('\n').filter((line: string) => line.trim());
                      if (lines.length > 1) {
                        return (
                          <ul className="space-y-2">
                            {lines.map((line, idx) => (
                              <li key={idx} className="flex gap-3 text-slate-700 dark:text-slate-300 p-2 hover:bg-slate-50 dark:hover:bg-slate-900/30 rounded transition-colors">
                                <span className="text-blue-500 font-bold">✓</span>
                                <span>{line.trim()}</span>
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      return <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg text-slate-700 dark:text-slate-300 leading-relaxed">{product.specifications}</div>;
                    }
                  })()}
                </div>
              ) : (
                <p className="text-muted-foreground">No hay especificaciones disponibles.</p>
              )}
            </TabsContent>

            <TabsContent value="locations" className="space-y-4 mt-6">
              {locStock.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-200">✓ Producto disponible en {locStock.length} ubicación{locStock.length > 1 ? 'es' : ''}</p>
                  </div>
                  <div className="grid gap-4">
                    {locStock.map((loc) => (
                      <div key={loc.store_locations.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow hover:border-blue-400 dark:hover:border-blue-600">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                              <span className="text-lg">{loc.store_locations.location_type === 'physical' ? '🏪' : '📦'}</span>
                              {loc.store_locations.name}
                            </h3>
                            <div className="space-y-2 mt-2">
                              {loc.store_locations.address && (
                                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                                  <span>{loc.store_locations.address}</span>
                                </div>
                              )}
                              {loc.store_locations.hours && (
                                <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                                  <span>{loc.store_locations.hours}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${loc.stock > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {loc.stock}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {loc.stock > 0 ? '✓ En stock' : 'Agotado'}
                            </p>
                          </div>
                        </div>
                        {loc.store_locations.map_link && (
                          <Button
                            asChild
                            size="sm"
                            className="w-full mt-2"
                          >
                            <a href={loc.store_locations.map_link} target="_blank" rel="noopener noreferrer">
                              📍 Ver ubicación en mapa
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 text-center">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">⚠️ No hay información de disponibilidad en tiendas</p>
                  <p className="text-xs text-muted-foreground mt-1">Contacta con nosotros para conocer disponibilidad</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Productos relacionados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((prod) => (
              <Link key={prod.id} to={`/producto/${encodeURIComponent(prod.slug)}`} className="group">
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
                  {prod.price ? formatPrice(Number(prod.price)) : "N/A"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

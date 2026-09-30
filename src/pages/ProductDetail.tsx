import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useSEO } from "@/hooks/use-seo";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { Product } from "@/types";
import { computeDisplayPrice, formatPrice, formatCUP, formatMoney, hasSaneDiscount, warrantyTypeLabel, type DisplayPrice } from "@/lib/format";
import { flyToCart, ensureNcFx } from "@/lib/fly-to-cart";
import { responsiveImage } from "@/lib/responsive-image";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/seo";
import { buildShareImage } from "@/lib/share-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Share2, ArrowLeft, ChevronLeft, ChevronRight, MapPin, Clock, Truck, Expand } from "lucide-react";
import { toast } from "sonner";
import ImageViewer from "@/components/product/ImageViewer";
import { ChargerCalculator } from "@/components/ChargerCalculator";
import { ProductSpecs } from "@/components/ProductSpecs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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

// Etiqueta de precio principal: si la tasa no cargó y la conversión es
// desconocida, se muestra "—" en vez de inventar un número.
function displayPriceLabel(display: DisplayPrice): string {
  if (display.primary === "USD") return display.usd != null ? formatPrice(display.usd) : "—";
  return display.cup != null ? formatCUP(display.cup) : "—";
}

// Línea secundaria de conversión (puede quedar vacía si no hay tasa).
// NOTA: formatPrice ya incluye "$", no se añade " USD" detrás (doble símbolo).
function displayConvertedLine(display: DisplayPrice): string | null {
  if (display.primary === "USD") return display.cup != null ? `≈ ${formatCUP(display.cup)}` : null;
  return display.usd != null ? `≈ ${formatPrice(display.usd)}` : null;
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();  const { addItem } = useCart();
  const { rate: exchangeRate } = useExchangeRate();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [chargerOptions, setChargerOptions] = useState<Product[]>([]);
  const [locStock, setLocStock] = useState<LocationStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  
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
        if (ls) setLocStock(ls as unknown as LocationStock[]);

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
  const comparePrice = Number(product?.compare_price ?? 0);
  const priceNum = Number(product?.price ?? 0);
  // El "precio anterior" solo se muestra si el descuento es creíble
  // (>90% implicaría un dato mal cargado) y en la moneda del producto.
  const showCompare = hasSaneDiscount(priceNum, comparePrice);
  const discount = showCompare
    ? Math.round(((comparePrice - priceNum) / comparePrice) * 100)
    : null;
  const outOfStock = Number(product?.stock ?? 0) <= 0;

  useEffect(() => {
    ensureNcFx();
  }, []);

  const handleShare = async () => {
    if (!product) return;

    const productUrl = `${SITE_URL}/producto/${product.slug}`;
    const shareData: ShareData = {
      title: product.name,
      text: `${product.name} - ${displayPriceLabel(display)}\n${product.description || ''}\n¡Mira este producto en NeoCharge!`, // Richer text
      url: productUrl,
    };

    // Imagen para compartir: foto del producto con su QR en la esquina inferior derecha
    const mainImage = product.images?.[product.main_image_index ?? 0] ?? product.images?.[0];
    if (mainImage) {
      try {
        const file = await buildShareImage(mainImage, productUrl, product.slug);
        shareData.files = [file];
      } catch (error) {
        console.error("Error al generar la imagen para compartir:", error);
        // Plan B: compartir la foto original sin QR
        try {
          const response = await fetch(mainImage);
          const blob = await response.blob();
          const file = new File([blob], `${product.slug}.jpg`, { type: blob.type });
          shareData.files = [file];
        } catch {
          // Compartir solo texto si la imagen tampoco carga
        }
      }
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error("Error compartiendo:", error);
        if ((error as { name?: string } | null)?.name !== "AbortError") {
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
          <div className="aspect-square rounded-3xl nc-water-shine bg-gradient-to-br from-muted via-muted/60 to-muted" aria-hidden />
          <div className="space-y-4" aria-hidden>
            <div className="h-9 rounded-xl bg-muted animate-pulse w-3/4" />
            <div className="h-6 rounded-lg bg-muted animate-pulse w-1/4" />
            <div className="h-10 rounded-xl bg-muted animate-pulse w-1/2" />
            <div className="h-32 rounded-2xl bg-muted animate-pulse" />
            <div className="h-12 rounded-2xl bg-muted animate-pulse" />
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
  const handleAddToCart = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) flyToCart(e.currentTarget, mainImage);
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
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/tienda">Tienda</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product?.name ?? "Producto"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Main Product Section */}
      <div className="grid lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted">
            {mainImage ? (
              (() => {
                const ri = responsiveImage(mainImage, "(max-width: 1024px) 100vw, 600px");
                return (
                  <button
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label="Ampliar fotos del producto"
                    className="block w-full h-full cursor-zoom-in"
                  >
                    <img
                      src={ri.src}
                      srcSet={ri.srcSet}
                      sizes={ri.sizes}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      fetchPriority="high"
                      decoding="async"
                    />
                  </button>
                );
              })()
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Sin imagen
              </div>
            )}
            {mainImage && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 text-white text-xs px-3 py-1.5 pointer-events-none">
                <Expand className="h-3.5 w-3.5" />
                Toca para ampliar
              </div>
            )}
            {discount && (
              <div className="absolute top-4 right-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm font-semibold">
                -{discount}%
              </div>
            )}
          </div>

          {/* Visor a pantalla completa: pellizco, doble toque, deslizar */}
          {viewerOpen && images.length > 0 && (
            <ImageViewer
              images={images}
              initialIndex={activeImage}
              alt={product.name}
              onClose={() => setViewerOpen(false)}
              onIndexChange={setActiveImage}
            />
          )}

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
                  {(() => {
                    const ri = responsiveImage(img, "64px");
                    return (
                      <img
                        src={ri.src}
                        srcSet={ri.srcSet}
                        sizes={ri.sizes}
                        alt={`${product.name} ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    );
                  })()}
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
                {displayPriceLabel(display)}
              </span>
              {showCompare && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatMoney(Number(product.compare_price), product.currency)}
                </span>
              )}
            </div>
            {displayConvertedLine(display) && (
              <p className="text-sm text-muted-foreground">
                {displayConvertedLine(display)}
              </p>
            )}
          </div>

          {/* Stock Status */}
          <div className={`text-sm font-semibold ${outOfStock ? "text-destructive" : "text-green-600"}`}>
            {outOfStock ? "Agotado" : `${product.stock} disponibles`}
          </div>

          {/* Description */}
          {product.description && (
            <div className="glass rounded-3xl p-5 border-brand-200/60 hover-lift">
              <h3 className="font-semibold mb-3">Descripción</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Add to Cart */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-slate-200/80 bg-white/70 rounded-2xl backdrop-blur overflow-hidden">
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
              className="w-full h-12 text-base nc-btn-shine rounded-2xl relative overflow-hidden active:scale-[0.99] transition-transform"
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
            <div className="glass rounded-2xl p-4 text-sm border-brand-200/60">
              <p className="font-semibold text-brand-800 mb-1">✓ {warrantyTypeLabel(product.warranty_type)}</p>
              <p className="text-muted-foreground">Todos nuestros productos incluyen garantía completa y soporte técnico.</p>
            </div>
          )}

          {/* Delivery: entrelazado con la calculadora de envío */}
          <Link
            to="/calcular-envio"
            className="flex items-center gap-3 glass rounded-3xl p-4 text-sm hover:border-brand-400 hover-lift transition-colors group"
          >
            <span className="nc-icon-tile-sm">
              <Truck className="w-5 h-5" />
            </span>
            <span>
              <span className="font-semibold block group-hover:text-primary transition-colors">
                ¿Lo quieres a domicilio?
              </span>
              <span className="text-muted-foreground">
                Calcula el costo de la mensajería hasta tu ubicación.
              </span>
            </span>
          </Link>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.35fr_0.8fr] mb-16">
        {product.warranty_type === "charger" ? (
          <div>
            <div className="glass rounded-3xl p-6 hover-lift">
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
              <ProductSpecs specifications={product.specifications} />
            </TabsContent>

            <TabsContent value="locations" className="space-y-4 mt-6">
              {locStock.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-green-50/80 border border-green-200/70 rounded-2xl p-4 mb-4">
                    <p className="text-sm font-semibold text-green-800">✓ Producto disponible en {locStock.length} ubicación{locStock.length > 1 ? 'es' : ''}</p>
                  </div>
                  <div className="grid gap-4">
                    {locStock.map((loc) => (
                      <div key={loc.store_locations.id} className="glass rounded-3xl p-4 hover:border-brand-400 hover-lift transition-shadow">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <span className="text-lg">{loc.store_locations.location_type === 'physical' ? '🏪' : '📦'}</span>
                              {loc.store_locations.name}
                            </h3>
                            <div className="space-y-2 mt-2">
                              {loc.store_locations.address && (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-600" />
                                  <span>{loc.store_locations.address}</span>
                                </div>
                              )}
                              {loc.store_locations.hours && (
                                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-600" />
                                  <span>{loc.store_locations.hours}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-3xl font-bold ${loc.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
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
                <div className="bg-yellow-50/80 border border-yellow-200/70 rounded-2xl p-4 text-center">
                  <p className="text-sm font-semibold text-yellow-900">⚠️ No hay información de disponibilidad en tiendas</p>
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
                  {prod.price ? formatMoney(Number(prod.price), prod.currency) : "N/A"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

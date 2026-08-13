import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/use-seo";
import { ProductCard, Product } from "@/components/ProductCard";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { Button } from "@/components/ui/button";
import { Loader2, HeartOff } from "lucide-react";

export default function FavoritesPage() {
  useSEO("favorites", "Tus productos favoritos en NeoCharge.");

  const { favoriteIds, loading: favoritesLoading } = useUnifiedFavorites();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllProducts = async () => {
      setProductsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,slug,price,compare_price,images,main_image_index,stock,is_featured,currency,price_cup,extra_cup_per_usd,warranty_type")
          .eq("is_active", true);

        if (error) throw error;
        setAllProducts(data as Product[]);
      } catch (err: any) {
        console.error("Error loading all products:", err);
        setError("No se pudieron cargar los productos. Intenta de nuevo más tarde.");
      } finally {
        setProductsLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  const favoriteProducts = allProducts.filter((product) =>
    favoriteIds.includes(product.id)
  );

  const isLoading = productsLoading || favoritesLoading;
  const hasFavorites = favoriteProducts.length > 0;

  return (
    <div className="container-page py-16">
      <div className="max-w-2xl mx-auto text-center mb-12">
        <h1 className="font-display text-5xl font-bold leading-tight text-foreground mb-4">
          Tus Productos Favoritos
        </h1>
        <p className="text-lg text-muted-foreground">
          Aquí encontrarás todos los productos que has guardado para más tarde.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-xl">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-lg text-muted-foreground">Cargando tus favoritos...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 bg-destructive/10 text-destructive rounded-xl">
          <p className="text-lg font-semibold mb-2">¡Oops! Ha ocurrido un error.</p>
          <p className="text-sm text-destructive-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">Recargar</Button>
        </div>
      ) : !hasFavorites ? (
        <div className="flex flex-col items-center justify-center p-8 bg-secondary rounded-xl text-secondary-foreground">
          <HeartOff className="w-16 h-16 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-bold mb-2">No tienes productos favoritos aún.</h2>
          <p className="text-lg text-muted-foreground mb-6 text-center">
            Explora nuestra tienda y añade los productos que más te gusten.
          </p>
          <Button asChild>
            <Link to="/tienda">Ir a la Tienda</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favoriteProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              // isFavorite y onToggleFavorite ya son manejados internamente por ProductCard
              // gracias a las modificaciones del Paso 2
            />
          ))}
        </div>
      )}
    </div>
  );
}

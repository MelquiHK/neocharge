import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useUserFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("user_favorites")
      .select("product_id")
      .eq("user_id", user.id);

    if (error) {
      toast.error("Error cargando favoritos: " + error.message);
      setFavoriteIds(new Set());
    } else {
      setFavoriteIds(new Set((data ?? []).map((item: any) => item.product_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!user) {
      toast.error("Inicia sesión para guardar favoritos.");
      return;
    }

    const already = favoriteIds.has(productId);
    if (already) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
      if (error) {
        toast.error("No se pudo quitar de favoritos: " + error.message);
        return;
      }
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      return;
    }

    const { error } = await supabase.from("user_favorites").insert({ user_id: user.id, product_id: productId });
    if (error) {
      toast.error("No se pudo marcar como favorito: " + error.message);
      return;
    }
    setFavoriteIds((prev) => new Set(prev).add(productId));
  }, [favoriteIds, user]);

  return {
    favoriteIds,
    isFavorite: (productId: string) => favoriteIds.has(productId),
    toggleFavorite,
    loading,
  };
}

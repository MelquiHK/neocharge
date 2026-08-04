import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STORAGE_KEY = "neocharge_favorites_v1";

function readLocalFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeLocalFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readLocalFavorites());
  const [loading, setLoading] = useState(!!user);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(readLocalFavorites());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("product_favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (cancelled) return;

      if (error) {
        console.warn("Favorites load failed:", error.message);
        setFavoriteIds(readLocalFavorites());
      } else {
        const ids = (data ?? []).map((r) => r.product_id);
        setFavoriteIds(ids);
        writeLocalFavorites(ids);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.includes(productId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      const wasFavorite = favoriteIds.includes(productId);
      const next = wasFavorite
        ? favoriteIds.filter((id) => id !== productId)
        : [...favoriteIds, productId];

      setFavoriteIds(next);
      writeLocalFavorites(next);

      if (wasFavorite) {
        toast.success("Eliminado de favoritos");
      } else {
        toast.success("Añadido a favoritos");
      }

      if (!user) return;

      if (wasFavorite) {
        const { error } = await supabase
          .from("product_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) {
          toast.error("No se pudo actualizar favoritos");
          setFavoriteIds(favoriteIds);
          writeLocalFavorites(favoriteIds);
        }
      } else {
        const { error } = await supabase.from("product_favorites").insert({
          user_id: user.id,
          product_id: productId,
        });
        if (error) {
          toast.error("No se pudo guardar en favoritos");
          setFavoriteIds(favoriteIds);
          writeLocalFavorites(favoriteIds);
        }
      }
    },
    [favoriteIds, user],
  );

  return useMemo(
    () => ({
      favoriteIds,
      favoriteCount: favoriteIds.length,
      isFavorite,
      toggleFavorite,
      loading,
    }),
    [favoriteIds, isFavorite, toggleFavorite, loading],
  );
}

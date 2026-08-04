import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const FAVORITES_TABLE = "user_favorites";
const LEGACY_FAVORITES_TABLE = "product_favorites";

function isMissingTableError(error: any) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST100" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes("relation \"user_favorites\" does not exist") ||
    message.includes("public.user_favorites") ||
    (message.includes("user_favorites") && message.includes("public"))
  );
}

export function useUserFavorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesTable, setFavoritesTable] = useState(FAVORITES_TABLE);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);

    const queryFavorites = async (table: string) =>
      supabase.from(table).select("product_id").eq("user_id", user.id);

    let table = favoritesTable;
    let { data, error } = await queryFavorites(table);
    if (error && isMissingTableError(error)) {
      table = LEGACY_FAVORITES_TABLE;
      const fallback = await queryFavorites(table);
      data = fallback.data;
      error = fallback.error;
      if (!error) setFavoritesTable(table);
    }

    if (error) {
      toast.error("Error cargando favoritos: " + error.message);
      setFavoriteIds(new Set());
    } else {
      setFavoriteIds(new Set((data ?? []).map((item: any) => item.product_id)));
    }
    setLoading(false);
  }, [user, favoritesTable]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!user) {
      toast.error("Inicia sesión o crea una cuenta para guardar favoritos.");
      navigate(`/auth?mode=signup&next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    const already = favoriteIds.has(productId);
    const runFavoriteQuery = async (table: string, action: "insert" | "delete") => {
      if (action === "delete") {
        return supabase.from(table).delete().eq("user_id", user.id).eq("product_id", productId);
      }
      return supabase.from(table).insert({ user_id: user.id, product_id: productId });
    };

    const tableToUse = favoritesTable === FAVORITES_TABLE ? FAVORITES_TABLE : LEGACY_FAVORITES_TABLE;

    if (already) {
      let { error } = await runFavoriteQuery(tableToUse, "delete");
      if (error && isMissingTableError(error)) {
        const fallback = await runFavoriteQuery(LEGACY_FAVORITES_TABLE, "delete");
        error = fallback.error;
        if (!error) setFavoritesTable(LEGACY_FAVORITES_TABLE);
      }
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

    let { error } = await runFavoriteQuery(tableToUse, "insert");
    if (error && isMissingTableError(error)) {
      console.debug("user_favorites missing, falling back to product_favorites");
      const fallback = await runFavoriteQuery(LEGACY_FAVORITES_TABLE, "insert");
      error = fallback.error;
      if (!error) setFavoritesTable(LEGACY_FAVORITES_TABLE);
    }
    if (error) {
      toast.error("No se pudo marcar como favorito: " + error.message);
      return;
    }
    setFavoriteIds((prev) => new Set(prev).add(productId));
  }, [favoriteIds, user, navigate, location.pathname, location.search, favoritesTable]);

  return {
    favoriteIds,
    isFavorite: (productId: string) => favoriteIds.has(productId),
    toggleFavorite,
    loading,
  };
}

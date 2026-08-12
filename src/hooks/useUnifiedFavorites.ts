import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// --- Constantes ---
const LOCAL_STORAGE_KEY = "neocharge_favorites_v1";
const SUPABASE_USER_FAVORITES_TABLE = "user_favorites";
const SUPABASE_PRODUCT_FAVORITES_TABLE = "product_favorites"; // Tabla legacy/fallback

// --- Helpers para localStorage ---
function readLocalFavoriteIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function writeLocalFavoriteIds(ids: Set<string>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

// --- Helpers para errores de Supabase ---
function isMissingTableError(error: any) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    error?.code === "PGRST100" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    message.includes(`relation "${SUPABASE_USER_FAVORITES_TABLE}" does not exist`) ||
    message.includes(`public.${SUPABASE_USER_FAVORITES_TABLE}`)
  );
}

// --- Hook Principal ---
export function useUnifiedFavorites() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => readLocalFavoriteIds());
  const [loading, setLoading] = useState(true);
  const [favoritesTable, setFavoritesTable] = useState(SUPABASE_USER_FAVORITES_TABLE);
  const [migrationAttempted, setMigrationAttempted] = useState(false);

  // Función para realizar la consulta a Supabase (insertar/eliminar)
  const runSupabaseFavoriteQuery = useCallback(
    async (table: string, action: "insert" | "delete", productId: string) => {
      if (!user) throw new Error("User not authenticated for Supabase operation.");

      if (action === "delete") {
        return supabase.from(table).delete().eq("user_id", user.id).eq("product_id", productId);
      }
      return supabase.from(table).insert({ user_id: user.id, product_id: productId });
    },
    [user],
  );

  // Función para migrar favoritos de local a Supabase
  const migrateLocalFavorites = useCallback(async () => {
    if (!user || migrationAttempted) return;

    const localFavorites = readLocalFavoriteIds();
    if (localFavorites.size === 0) {
      setMigrationAttempted(true);
      return;
    }

    console.debug("Migrando favoritos locales a Supabase...");
    for (const productId of localFavorites) {
      // Intentar insertar cada favorito. Ignorar si ya existe.
      await runSupabaseFavoriteQuery(favoritesTable, "insert", productId); // No manejar errores aquí directamente, solo insertar
    }
    // Una vez migrados, sobrescribir los locales con los de Supabase (se cargarán en loadFavorites)
    writeLocalFavoriteIds(new Set());
    setMigrationAttempted(true);
    toast.success("Favoritos locales migrados a tu cuenta!");
  }, [user, migrationAttempted, favoritesTable, runSupabaseFavoriteQuery]);

  // Función para cargar favoritos (desde local o Supabase)
  const loadFavorites = useCallback(async () => {
    setLoading(true);

    if (!user) {
      // Cargar solo desde localStorage para usuarios no autenticados
      const local = readLocalFavoriteIds();
      setFavoriteIds(local);
      setLoading(false);
      return;
    }

    // Para usuarios autenticados, primero intentar migrar si no se ha hecho
    if (!migrationAttempted) {
      await migrateLocalFavorites();
    }

    // Luego cargar desde Supabase (con lógica de fallback)
    const queryFavorites = async (table: string) =>
      supabase.from(table).select("product_id").eq("user_id", user.id);

    let currentTable = favoritesTable;
    let { data, error } = await queryFavorites(currentTable);

    if (error && isMissingTableError(error)) {
      // Fallback a la tabla legacy si la nueva no existe
      currentTable = SUPABASE_PRODUCT_FAVORITES_TABLE;
      const fallback = await queryFavorites(currentTable);
      data = fallback.data;
      error = fallback.error;
      if (!error) setFavoritesTable(currentTable); // Persistir la tabla correcta
    }

    if (error) {
      toast.error("Error cargando favoritos: " + error.message);
      setFavoriteIds(new Set());
      writeLocalFavoriteIds(new Set()); // Limpiar local si hay error en Supabase
    } else {
      const ids = new Set((data ?? []).map((item: any) => item.product_id));
      setFavoriteIds(ids);
      writeLocalFavoriteIds(ids); // Sincronizar local con Supabase
    }
    setLoading(false);
  }, [user, favoritesTable, migrationAttempted, migrateLocalFavorites, runSupabaseFavoriteQuery]);

  useEffect(() => {
    if (!isAuthLoading) { // Solo cargar después de que el estado de autenticación se haya resuelto
      void loadFavorites();
    }
  }, [isAuthLoading, loadFavorites]);

  // Chequear si un producto es favorito
  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds],
  );

  // Función para alternar el estado de favorito
  const toggleFavorite = useCallback(
    async (productId: string) => {
      const wasFavorite = favoriteIds.has(productId);
      const nextFavoriteIds = new Set(favoriteIds);

      if (wasFavorite) {
        nextFavoriteIds.delete(productId);
      } else {
        nextFavoriteIds.add(productId);
      }

      // Optimistic UI update
      setFavoriteIds(nextFavoriteIds);
      writeLocalFavoriteIds(nextFavoriteIds);
      toast.success(wasFavorite ? "Eliminado de favoritos" : "Añadido a favoritos");

      if (!user) {
        // Redirigir a login si el usuario no está autenticado y quiere persistir
        toast.error("Inicia sesión o crea una cuenta para guardar favoritos.");
        navigate(`/auth?mode=signup&next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }

      // Si el usuario está autenticado, sincronizar con Supabase
      try {
        let { error } = await runSupabaseFavoriteQuery(favoritesTable, wasFavorite ? "delete" : "insert", productId);

        if (error && isMissingTableError(error)) {
          // Si falla la tabla actual, intentar con la legacy
          const fallback = await runSupabaseFavoriteQuery(SUPABASE_PRODUCT_FAVORITES_TABLE, wasFavorite ? "delete" : "insert", productId);
          error = fallback.error;
          if (!error) setFavoritesTable(SUPABASE_PRODUCT_FAVORITES_TABLE); // Actualizar la tabla si el fallback funcionó
        }

        if (error) {
          console.error("Error al sincronizar favoritos con Supabase:", error);
          // Rollback UI si falla la operación en Supabase
          const rollbackIds = new Set(favoriteIds);
          setFavoriteIds(rollbackIds);
          writeLocalFavoriteIds(rollbackIds);
          toast.error(`No se pudo ${wasFavorite ? "quitar" : "añadir"} de favoritos.`);
        }
      } catch (error) {
        console.error("Error inesperado en toggleFavorite:", error);
        const rollbackIds = new Set(favoriteIds);
        setFavoriteIds(rollbackIds);
        writeLocalFavoriteIds(rollbackIds);
        toast.error(`No se pudo ${wasFavorite ? "quitar" : "añadir"} de favoritos.`);
      }
    },
    [favoriteIds, user, navigate, location.pathname, location.search, favoritesTable, runSupabaseFavoriteQuery],
  );

  return useMemo(
    () => ({
      favoriteIds: Array.from(favoriteIds), // Devolver como Array para consumo más fácil
      favoriteCount: favoriteIds.size,
      isFavorite,
      toggleFavorite,
      loading: loading || isAuthLoading, // Combinar estados de carga de auth y favoritos
    }),
    [favoriteIds, isFavorite, toggleFavorite, loading, isAuthLoading],
  );
}

import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { getSupabase } from "@/integrations/supabase/lazy-client";
import type { Session, User } from "@supabase/supabase-js";
import { NO_PERMS, type AdminPermissions, type UserRole, type Profile } from "@/types";
import { AuthContext, type AuthContextValue } from "@/hooks/use-auth";

const OWNER_ADMIN_EMAIL = "melcraft96@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(NO_PERMS);
  const [loading, setLoading] = useState(true);
  const [authDataReady, setAuthDataReady] = useState(false);
  // Id del usuario cuyos roles ya se resolvieron. Evita que un TOKEN_REFRESHED
  // (u otro evento sin cambio de usuario) desmonte las páginas con guardia
  // de rol y pierda su estado local (p. ej. el recorrido del mensajero).
  const resolvedUserId = useRef<string | null>(null);

  const loadAuthData = useCallback(async (userId: string, email?: string, userMetadata?: Record<string, unknown>) => {
    // El cliente Supabase viaja en un chunk asíncrono (fuera del bundle
    // inicial); se resuelve aquí sin bloquear el primer paint.
    const supabase = await getSupabase();
    try {
      const [{ data: roles }, { data: permData }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("admin_permissions").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]);

    let profile = profileData as Profile | null;
    if (!profile) {
      // Primer login (p. ej. OAuth con Google): crear la fila en profiles.
      const fullName =
        (userMetadata?.["full_name"] as string | undefined) ??
        (userMetadata?.["name"] as string | undefined) ??
        null;
      const { data: created } = await supabase
        .from("profiles")
        .insert({ id: userId, email: email ?? null, full_name: fullName })
        .select()
        .single();
      if (created) profile = created as Profile;
    }

    const normalizedEmail = email?.toLowerCase() ?? undefined;
    const isOwnerByEmail = !!normalizedEmail && normalizedEmail === OWNER_ADMIN_EMAIL.toLowerCase();

    // Determine primary role (simplification: take the most powerful one)
    const roleList = roles?.map(r => r.role as UserRole) ?? [];
    let primaryRole: UserRole = "user";
    if (roleList.includes("owner") || isOwnerByEmail) primaryRole = "owner";
    else if (roleList.includes("admin")) primaryRole = "admin";
    else if (roleList.includes("gestor")) primaryRole = "gestor";
    else if (roleList.includes("mensajero")) primaryRole = "mensajero";
    else if (roleList.includes("cliente")) primaryRole = "cliente";

    setRole(primaryRole);
    setProfile(profile);

    const resolvedPermissions = {
      is_owner: primaryRole === "owner" || !!permData?.is_owner || isOwnerByEmail,
      can_manage_products: !!permData?.can_manage_products || primaryRole === "admin" || primaryRole === "owner",
      can_manage_orders: !!permData?.can_manage_orders || primaryRole === "admin" || primaryRole === "owner",
      can_manage_customers: !!permData?.can_manage_customers || primaryRole === "admin" || primaryRole === "owner",
      can_manage_locations: !!permData?.can_manage_locations || primaryRole === "admin" || primaryRole === "owner",
      can_manage_blog: !!permData?.can_manage_blog || primaryRole === "admin" || primaryRole === "owner",
      can_manage_rates: !!permData?.can_manage_rates || primaryRole === "admin" || primaryRole === "owner",
      can_view_finances: !!permData?.can_view_finances || primaryRole === "admin" || primaryRole === "owner",
      can_manage_admins: !!permData?.can_manage_admins || primaryRole === "owner",
    };

    setPermissions(resolvedPermissions);
    } catch (err) {
      // Si la carga de roles/permisos falla (p. ej. bache de red), el usuario queda con el
      // rol por defecto ("user") en vez de dejar una promesa rechazada sin manejar.
      console.error("Error cargando datos de autenticación:", err);
    } finally {
      resolvedUserId.current = userId;
      setAuthDataReady(true);
    }
  }, []);

  // Nota: resolvedUserId se fija aquí también por si loadAuthData se llama
  // desde refreshPermissions u otra vía sin pasar por onAuthStateChange.

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    // La suscripción de auth espera al chunk asíncrono de Supabase: la app
    // pinta primero y la sesión se resuelve en cuanto el chunk llega.
    getSupabase()
      .then((supabase) => {
        if (cancelled) return;
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          const newUserId = newSession?.user?.id ?? null;
          const userChanged = newUserId !== resolvedUserId.current;
          setSession(newSession);
          setUser(newSession?.user ?? null);
          if (newSession?.user) {
            // Solo recargar roles si el usuario cambió de verdad (login/logout/
            // cambio de cuenta). Un TOKEN_REFRESHED no toca authDataReady: las
            // páginas con guardia no se desmontan ni pierden su estado.
            if (userChanged) {
              resolvedUserId.current = newUserId;
              const u = newSession.user;
              setAuthDataReady(false);
              setTimeout(() => loadAuthData(u.id, u.email ?? undefined, u.user_metadata ?? undefined), 0);
            }
          } else {
            resolvedUserId.current = null;
            setRole("user");
            setProfile(null);
            setPermissions(NO_PERMS);
            setAuthDataReady(true);
          }
        });
        unsubscribe = () => subscription.unsubscribe();

        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (cancelled) return;
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) loadAuthData(currentSession.user.id, currentSession.user.email ?? undefined, currentSession.user.user_metadata ?? undefined);
          else setAuthDataReady(true);
          setLoading(false);
        }).catch((err) => {
          // Si getSession() rechaza (storage corrupto/bloqueado), salir del loader
          // en vez de dejar la app atorada en la pantalla de carga.
          console.error("Error obteniendo la sesión:", err);
          if (!cancelled) { setLoading(false); setAuthDataReady(true); }
        });
      })
      .catch((err) => {
        // Si el chunk de Supabase no pudo cargarse, no dejar la app en loader eterno.
        console.error("Error cargando el cliente de Supabase:", err);
        if (!cancelled) { setLoading(false); setAuthDataReady(true); }
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loadAuthData]);

  const refreshPermissions = useCallback(async () => {
    if (user) await loadAuthData(user.id, user.email ?? undefined);
  }, [user, loadAuthData]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const supabase = await getSupabase();
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile(data as Profile);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    const supabase = await getSupabase();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ 
      user, 
      session, 
      role,
      profile,
      isAdmin: role === "admin" || role === "owner", 
      isOwner: role === "owner",
      isGestor: role === "gestor",
      isMensajero: role === "mensajero",
      permissions, 
      loading,
      authDataReady,
      signOut, 
      refreshPermissions,
      refreshProfile
    }),
    [user, session, role, profile, permissions, loading, authDataReady, signOut, refreshPermissions, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

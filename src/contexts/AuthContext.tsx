import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { AdminPermissions, NO_PERMS, UserRole, Profile } from "@/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isOwner: boolean;
  isGestor: boolean;
  isMensajero: boolean;
  role: UserRole;
  profile: Profile | null;
  permissions: AdminPermissions;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const OWNER_ADMIN_EMAIL = "melcraft96@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(NO_PERMS);
  const [loading, setLoading] = useState(true);

  const loadAuthData = async (userId: string) => {
    const [{ data: roles }, { data: permData }, { data: profileData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("admin_permissions").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);

    const email = user?.email?.toLowerCase() ?? undefined;
    const isOwnerByEmail = !!email && email === OWNER_ADMIN_EMAIL.toLowerCase();

    // Determine primary role (simplification: take the most powerful one)
    const roleList = roles?.map(r => r.role as UserRole) ?? [];
    let primaryRole: UserRole = "user";
    if (roleList.includes("owner") || isOwnerByEmail) primaryRole = "owner";
    else if (roleList.includes("admin")) primaryRole = "admin";
    else if (roleList.includes("gestor")) primaryRole = "gestor";
    else if (roleList.includes("mensajero")) primaryRole = "mensajero";
    else if (roleList.includes("cliente")) primaryRole = "cliente";

    setRole(primaryRole);
    setProfile(profileData as Profile);

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
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => loadAuthData(newSession.user.id), 0);
      } else {
        setRole("user");
        setProfile(null);
        setPermissions(NO_PERMS);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) loadAuthData(currentSession.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshPermissions = async () => {
    if (user) await loadAuthData(user.id);
  };

  const refreshProfile = async () => {
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile(data as Profile);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

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
      signOut, 
      refreshPermissions,
      refreshProfile
    }),
    [user, session, role, profile, permissions, loading, signOut, refreshPermissions, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

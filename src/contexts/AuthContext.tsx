import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { AdminPermissions, NO_PERMS } from "@/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  permissions: AdminPermissions;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermissions>(NO_PERMS);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async (userId: string) => {
    const [{ data: roleData }, { data: permData }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
      supabase.from("admin_permissions").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setIsAdmin(!!roleData);
    if (permData) {
      setPermissions({
        is_owner: !!permData.is_owner,
        can_manage_products: !!permData.can_manage_products,
        can_manage_orders: !!permData.can_manage_orders,
        can_manage_customers: !!permData.can_manage_customers,
        can_manage_locations: !!permData.can_manage_locations,
        can_manage_blog: !!permData.can_manage_blog,
        can_manage_rates: !!permData.can_manage_rates,
        can_view_finances: !!permData.can_view_finances,
        can_manage_admins: !!permData.can_manage_admins,
      });
    } else {
      setPermissions(NO_PERMS);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => loadAdminData(newSession.user.id), 0);
      } else {
        setIsAdmin(false);
        setPermissions(NO_PERMS);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) loadAdminData(currentSession.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshPermissions = async () => {
    if (user) await loadAdminData(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, isAdmin, permissions, loading, signOut, refreshPermissions }),
    [user, session, isAdmin, permissions, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

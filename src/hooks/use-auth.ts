import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AdminPermissions, UserRole, Profile } from "@/types";

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

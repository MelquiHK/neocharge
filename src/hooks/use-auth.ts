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
  /** true cuando los roles/permisos ya se resolvieron (o no hay sesión). Evita
   *  redirecciones prematuras en páginas con guardia de rol al recargar directo. */
  authDataReady: boolean;
  /** true si la carga de roles/permisos falló tras los reintentos y nunca
   *  se resolvió para este usuario: la guardia debe ofrecer reintentar,
   *  NO concluir que el usuario no tiene permisos. */
  authDataFailed: boolean;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** Vuelve a cargar roles/permisos (botón «Reintentar» de las guardias). */
  retryAuthData: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

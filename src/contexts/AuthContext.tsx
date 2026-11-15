import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from "react";
import { getSupabase } from "@/integrations/supabase/lazy-client";
import type { Session, User } from "@supabase/supabase-js";
import { NO_PERMS, type AdminPermissions, type UserRole, type Profile } from "@/types";
import { AuthContext, type AuthContextValue } from "@/hooks/use-auth";

const OWNER_ADMIN_EMAIL = "melcraft96@gmail.com";

/** Reintentos de la carga de roles/permisos ante fallos transitorios de
 *  red: con la conexión de Cuba, que una de las 3 consultas falle al
 *  montar en frío es común; sin reintento, el usuario quedaba con el rol
 *  por defecto («user») y el panel lo botaba a «Acceso restringido»
 *  sin ser un cierre de sesión ni una falta de permisos real. */
const AUTH_DATA_RETRY_DELAYS_MS = [800, 2000];

/** Confirmación de un SIGNED_OUT NO pedido por el usuario antes de
 *  obedecerlo. Un evento sin sesión puede ser ajeno (otra pestaña o la
 *  app instalada cerrando/recuperando su sesión, con BroadcastChannel
 *  compartido) o TARDÍO (llega justo después de un login nuevo, de una
 *  recuperación que ya lo reemplazó). Obedecerlo a ciegas tumbaba `user`
 *  a null y las guardias de /cuenta y /admin rebotaban al login aunque
 *  la sesión siguiera viva en el almacenamiento: el «bucle de login»
 *  (pongo el correo, hace como que entra y me saca) del 2026-11-15.
 *  Solo se obedece al instante el cierre pedido con el botón de salir;
 *  cualquier otro se confirma contra el almacenamiento (ver
 *  confirmSignOut dentro del efecto de suscripción). */
const SIGNOUT_CONFIRM_DELAY_MS = 900;
const SIGNOUT_CONFIRM_RETRY_DELAY_MS = 2000;

/** ¿Queda alguna sesión de Supabase guardada en este navegador? La clave
 *  por defecto de auth-js es `sb-<ref>-auth-token`; se busca por patrón
 *  para no amarrarse al ref del proyecto. */
function hasStoredSessionToken(): boolean {
  try {
    if (typeof window === "undefined" || !window.localStorage) return false;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) return true;
    }
  } catch {
    /* almacenamiento inaccesible: se trata como «sin token» */
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(NO_PERMS);
  const [loading, setLoading] = useState(true);
  const [authDataReady, setAuthDataReady] = useState(false);
  // true cuando la carga de roles/permisos falló de forma definitiva
  // (tras reintentos) y NUNCA llegó a resolverse para este usuario: las
  // guardias deben ofrecer «Reintentar», no concluir que no es admin.
  const [authDataFailed, setAuthDataFailed] = useState(false);
  // Id del usuario cuyos roles ya se resolvieron. Evita que un TOKEN_REFRESHED
  // (u otro evento sin cambio de usuario) desmonte las páginas con guardia
  // de rol y pierda su estado local (p. ej. el recorrido del mensajero).
  const resolvedUserId = useRef<string | null>(null);
  // Usuario cuyo rol/permisos se resolvieron CON ÉXITO al menos una vez.
  // Distinto de resolvedUserId (que el listener fija antes de cargar):
  // decide si un fallo definitivo debe mostrar «Reintentar» (nunca se
  // resolvió) o conservar el rol vigente (un refresco falló).
  const roleResolvedFor = useRef<string | null>(null);
  // Carga en curso (deduplicación): el arranque dispara loadAuthData por
  // dos vías (onAuthStateChange y getSession) y no deben correr en paralelo.
  const inflightLoad = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  // Cierre pedido EXPLÍCITAMENTE por el usuario (botón «Cerrar sesión»):
  // su SIGNED_OUT se honra al instante. Cualquier otro evento sin sesión
  // pasa por la confirmación contra el almacenamiento.
  const intentionalSignOut = useRef(false);
  // Temporizador de la confirmación de un SIGNED_OUT no pedido.
  const signOutConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadAuthData = useCallback(async (userId: string, email?: string, userMetadata?: Record<string, unknown>) => {
    if (inflightLoad.current?.userId === userId) return inflightLoad.current.promise;

    const promise = (async () => {
      let lastError: unknown = null;
      for (let attempt = 0; attempt <= AUTH_DATA_RETRY_DELAYS_MS.length; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, AUTH_DATA_RETRY_DELAYS_MS[attempt - 1]));
        }
        try {
          // El cliente Supabase viaja en un chunk asíncrono (fuera del bundle
          // inicial); se resuelve aquí sin bloquear el primer paint. Va
          // DENTRO del intento: si el chunk no descarga, se reintenta como
          // cualquier otro fallo transitorio en vez de dejar la promesa
          // rechazada sin manejar y el panel colgado en «Abriendo tu panel…».
          const supabase = await getSupabase();
          const [rolesRes, permRes, profileRes] = await Promise.all([
            supabase.from("user_roles").select("role").eq("user_id", userId),
            supabase.from("admin_permissions").select("*").eq("user_id", userId).maybeSingle(),
            supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          ]);
          // PostgREST NO lanza ante un error de consulta: lo devuelve en
          // `error` con `data: null`. Hay que mirarlo explícitamente; si
          // una consulta falla, la carga entera se considera fallida (y se
          // reintenta), nunca se concluye el rol con datos a medias.
          if (rolesRes.error || permRes.error || profileRes.error) {
            throw rolesRes.error ?? permRes.error ?? profileRes.error;
          }
          const roles = rolesRes.data;
          const permData = permRes.data;
          const profileData = profileRes.data;

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
          setAuthDataFailed(false);
          resolvedUserId.current = userId;
          roleResolvedFor.current = userId;
          setAuthDataReady(true);
          return;
        } catch (err) {
          lastError = err;
          console.error("Error cargando datos de autenticación:", err);
        }
      }
      // Agotados los reintentos: si el rol de este usuario ya se resolvió
      // bien alguna vez, se conserva el que hay (un refresco fallido no
      // bota a nadie). Si nunca se resolvió, se marca el fallo para que
      // la guardia muestre «Reintentar» en vez de «Acceso restringido».
      if (roleResolvedFor.current !== userId) {
        setAuthDataFailed(true);
      }
      setAuthDataReady(true);
      void lastError;
    })();

    inflightLoad.current = { userId, promise };
    try {
      await promise;
    } finally {
      if (inflightLoad.current?.promise === promise) inflightLoad.current = null;
    }
  }, []);

  // Nota: resolvedUserId se fija aquí también por si loadAuthData se llama
  // desde refreshPermissions u otra vía sin pasar por onAuthStateChange.

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // La suscripción de auth espera al chunk asíncrono de Supabase: la app
    // pinta primero y la sesión se resuelve en cuanto el chunk llega.
    const setup = (attempt: number) => {
      getSupabase()
        .then((supabase) => {
          if (cancelled) return;

          // Aplica una sesión viva al estado. Solo recarga roles si el
          // usuario cambió de verdad (login/cambio de cuenta): un
          // TOKEN_REFRESHED no toca authDataReady, así las páginas con
          // guardia no se desmontan ni pierden su estado.
          const applySession = (liveSession: Session) => {
            // Una sesión viva invalida cualquier cierre en confirmación
            // y cualquier marca de cierre intencional ya consumida.
            intentionalSignOut.current = false;
            if (signOutConfirmTimer.current) {
              clearTimeout(signOutConfirmTimer.current);
              signOutConfirmTimer.current = null;
            }
            const newUserId = liveSession.user.id;
            const userChanged = newUserId !== resolvedUserId.current;
            setSession(liveSession);
            setUser(liveSession.user);
            if (userChanged) {
              resolvedUserId.current = newUserId;
              const u = liveSession.user;
              setAuthDataReady(false);
              setTimeout(() => loadAuthData(u.id, u.email ?? undefined, u.user_metadata ?? undefined), 0);
            }
          };

          // Da la sesión por cerrada de verdad: limpia todo el estado.
          const teardownSession = () => {
            resolvedUserId.current = null;
            roleResolvedFor.current = null;
            setSession(null);
            setUser(null);
            setRole("user");
            setProfile(null);
            setPermissions(NO_PERMS);
            setAuthDataFailed(false);
            setAuthDataReady(true);
          };

          // Confirmación de un SIGNED_OUT no pedido: se relee la sesión
          // del almacenamiento compartido antes de botar a nadie.
          // - Si hay sesión viva → el evento era ajeno o tardío: se
          //   restaura y NO se sale (esto rompe el bucle de login).
          // - Si no hay sesión NI token guardado → cierre real: se sale.
          // - Zona gris (token guardado pero getSession sin sesión, o
          //   getSession fallando): un reintento; si la duda persiste se
          //   CONSERVA el estado — un fallo de red o un refresco en
          //   curso en otro contexto no es un cierre de sesión.
          const confirmSignOut = async (confirmAttempt: number): Promise<void> => {
            if (cancelled) return;
            const retryLater = () => {
              if (cancelled || confirmAttempt > 0) return;
              signOutConfirmTimer.current = setTimeout(() => {
                signOutConfirmTimer.current = null;
                void confirmSignOut(confirmAttempt + 1);
              }, SIGNOUT_CONFIRM_RETRY_DELAY_MS);
            };
            try {
              const { data: { session: current } } = await supabase.auth.getSession();
              if (cancelled) return;
              if (current?.user) {
                applySession(current);
                return;
              }
              if (!hasStoredSessionToken()) {
                teardownSession();
                return;
              }
              retryLater();
            } catch (err) {
              console.error("Error confirmando el cierre de sesión:", err);
              retryLater();
            }
          };

          const scheduleSignOutConfirmation = () => {
            if (signOutConfirmTimer.current) return; // ya hay una en curso
            signOutConfirmTimer.current = setTimeout(() => {
              signOutConfirmTimer.current = null;
              void confirmSignOut(0);
            }, SIGNOUT_CONFIRM_DELAY_MS);
          };

          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (newSession?.user) {
              applySession(newSession);
            } else if (intentionalSignOut.current) {
              // Cierre pedido por el propio usuario: se honra al instante.
              intentionalSignOut.current = false;
              if (signOutConfirmTimer.current) {
                clearTimeout(signOutConfirmTimer.current);
                signOutConfirmTimer.current = null;
              }
              teardownSession();
            } else {
              // SIGNED_OUT ajeno/tardío o INITIAL_SESSION sin sesión:
              // NO se obedece a ciegas; se confirma contra el
              // almacenamiento antes de botar al usuario al login.
              scheduleSignOutConfirmation();
            }
          });
          unsubscribe = () => subscription.unsubscribe();

          // Sesión inicial del arranque. Un rechazo de getSession() (p.
          // ej. timeout del lock porque OTRA ventana está refrescando)
          // NO significa «sin sesión»: rendirse al primer fallo dejaba
          // user=null y la guardia botaba al login con la sesión viva
          // guardada. Se reintenta una vez antes de darla por ausente.
          const resolveInitialSession = (initAttempt: number) => {
            supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
              if (cancelled) return;
              if (currentSession?.user) {
                setSession(currentSession);
                setUser(currentSession.user);
                loadAuthData(currentSession.user.id, currentSession.user.email ?? undefined, currentSession.user.user_metadata ?? undefined);
              } else if (!resolvedUserId.current) {
                // Solo se acepta el «sin sesión» si ningún evento ya
                // resolvió un usuario entretanto (login rápido tras un
                // arranque lento): un null viejo no tumba un login nuevo.
                setSession(null);
                setUser(null);
                setAuthDataReady(true);
              }
              setLoading(false);
            }).catch((err) => {
              console.error("Error obteniendo la sesión:", err);
              if (cancelled) return;
              if (initAttempt === 0) {
                retryTimer = setTimeout(() => resolveInitialSession(1), 1500);
              } else {
                setLoading(false);
                setAuthDataReady(true);
              }
            });
          };
          resolveInitialSession(0);
        })
        .catch((err) => {
          // Si el chunk de Supabase no pudo cargarse (red caída en el
          // arranque), se reintenta una vez pasados unos segundos antes
          // de rendirse: rendirse aquí dejaba user=null y el panel
          // redirigía al login sin que la sesión hubiera muerto.
          console.error("Error cargando el cliente de Supabase:", err);
          if (cancelled) return;
          if (attempt === 0) {
            retryTimer = setTimeout(() => setup(1), 2500);
          } else {
            setLoading(false);
            setAuthDataReady(true);
          }
        });
    };
    setup(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (signOutConfirmTimer.current) {
        clearTimeout(signOutConfirmTimer.current);
        signOutConfirmTimer.current = null;
      }
      unsubscribe?.();
    };
  }, [loadAuthData]);

  const refreshPermissions = useCallback(async () => {
    if (user) await loadAuthData(user.id, user.email ?? undefined);
  }, [user, loadAuthData]);

  /** Reintento manual desde las guardias («Reintentar»): vuelve a pedir
   *  roles/permisos mostrando la pantalla de carga del panel. */
  const retryAuthData = useCallback(() => {
    if (!user) return;
    setAuthDataFailed(false);
    setAuthDataReady(false);
    void loadAuthData(user.id, user.email ?? undefined, user.user_metadata ?? undefined);
  }, [user, loadAuthData]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const supabase = await getSupabase();
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) setProfile(data as Profile);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    // Marca el cierre como pedido por el usuario: el SIGNED_OUT que
    // provoca se honra al instante, sin pasar por la confirmación que
    // protege contra cierres ajenos o tardíos.
    intentionalSignOut.current = true;
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
      authDataFailed,
      signOut,
      refreshPermissions,
      refreshProfile,
      retryAuthData
    }),
    [user, session, role, profile, permissions, loading, authDataReady, authDataFailed, signOut, refreshPermissions, refreshProfile, retryAuthData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

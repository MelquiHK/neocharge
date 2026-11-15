import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "@/hooks/use-auth";
import { getSupabase } from "@/integrations/supabase/lazy-client";

/* Regresión del «el panel me bota de mi usuario» (2026-11-15):
   la carga de roles/permisos NO debe concluir «no es admin» cuando lo
   que pasó fue un fallo transitorio de red. PostgREST devuelve los
   errores en banda ({ data: null, error }) sin lanzar: hay que mirarlos,
   reintentar, y si el fallo es definitivo marcar authDataFailed para
   que la guardia ofrezca «Reintentar» en vez de «Acceso restringido». */

vi.mock("@/integrations/supabase/lazy-client", () => ({ getSupabase: vi.fn() }));

const fakeUser = {
  id: "user-1",
  email: "melcraft96@gmail.com",
  user_metadata: {},
} as unknown as import("@supabase/supabase-js").User;

const fakeSession = {
  user: fakeUser,
  access_token: "tok",
  refresh_token: "ref",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
} as unknown as import("@supabase/supabase-js").Session;

/** Contador de intentos de la consulta de roles (una por intento de carga). */
const state = {
  rolesCalls: 0,
  rolesFailTimes: 0,
  /** Callback de onAuthStateChange capturado: las pruebas emiten eventos. */
  authCallback: null as null | ((event: string, session: unknown) => void),
  /** Sesión que devuelve getSession() (programable por prueba). */
  session: fakeSession as unknown,
};

function makeFakeClient() {
  const chain = (result: { data: unknown; error: unknown }) => {
    const obj: Record<string, unknown> = {
      select: () => obj,
      eq: () => obj,
      maybeSingle: () => Promise.resolve(result),
      single: () => Promise.resolve(result),
      insert: () => obj,
      then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
        resolve(result);
      },
    };
    return obj;
  };
  return {
    auth: {
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        state.authCallback = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: () => Promise.resolve({ data: { session: state.session } }),
      // Como la librería real: signOut emite SIGNED_OUT a los suscriptores.
      signOut: vi.fn(async () => {
        state.authCallback?.("SIGNED_OUT", null);
      }),
    },
    from: (table: string) => {
      if (table === "user_roles") {
        state.rolesCalls += 1;
        const fail = state.rolesCalls <= state.rolesFailTimes;
        return chain(
          fail
            ? { data: null, error: { message: "Failed to fetch" } }
            : { data: [{ role: "owner" }], error: null },
        );
      }
      if (table === "admin_permissions") {
        return chain({ data: null, error: null });
      }
      // profiles
      return chain({ data: { id: "user-1", email: "melcraft96@gmail.com" }, error: null });
    },
  };
}

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="role">{auth.role}</span>
      <span data-testid="ready">{String(auth.authDataReady)}</span>
      <span data-testid="failed">{String(auth.authDataFailed)}</span>
      <span data-testid="user">{auth.user ? "yes" : "no"}</span>
      <button onClick={auth.retryAuthData}>retry</button>
      <button onClick={auth.signOut}>out</button>
    </div>
  );
}

describe("AuthProvider — carga de roles ante fallos de red", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.rolesCalls = 0;
    state.rolesFailTimes = 0;
    state.authCallback = null;
    state.session = fakeSession;
    vi.mocked(getSupabase).mockResolvedValue(
      makeFakeClient() as unknown as Awaited<ReturnType<typeof getSupabase>>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("un fallo transitorio se reintenta solo y el rol se resuelve", async () => {
    state.rolesFailTimes = 1; // el primer intento falla; el segundo entra
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(state.rolesCalls).toBe(2);
    expect(screen.getByTestId("role").textContent).toBe("owner");
    expect(screen.getByTestId("failed").textContent).toBe("false");
    expect(screen.getByTestId("ready").textContent).toBe("true");
  });

  it("fallo definitivo: authDataFailed=true (no «user» a secas) y Reintentar recupera", async () => {
    state.rolesFailTimes = Number.POSITIVE_INFINITY;
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    // 1 intento + 2 reintentos, y la guardia queda avisada del fallo.
    expect(state.rolesCalls).toBe(3);
    expect(screen.getByTestId("ready").textContent).toBe("true");
    expect(screen.getByTestId("failed").textContent).toBe("true");
    expect(screen.getByTestId("role").textContent).toBe("user");

    // La red «vuelve»: el botón Reintentar resuelve el rol sin re-login.
    state.rolesFailTimes = 0;
    fireEvent.click(screen.getByText("retry"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByTestId("role").textContent).toBe("owner");
    expect(screen.getByTestId("failed").textContent).toBe("false");
  });
});

/* Regresión del «bucle de login» (2026-11-15, segunda parte): pongo el
   correo, hace como que entra y me saca. Un SIGNED_OUT que NO pidió el
   usuario (ajeno por BroadcastChannel — otra pestaña o la app instalada
   comparten almacenamiento — o tardío tras un login nuevo) NO debe
   tumbar la sesión si el almacenamiento aún guarda una sesión viva:
   primero se confirma con getSession(). El cierre real (sin sesión ni
   token) y el cierre pedido con el botón sí se obedecen. */
describe("AuthProvider — SIGNED_OUT ajeno y bucle de login", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.rolesCalls = 0;
    state.rolesFailTimes = 0;
    state.authCallback = null;
    state.session = fakeSession;
    window.localStorage.clear();
    vi.mocked(getSupabase).mockResolvedValue(
      makeFakeClient() as unknown as Awaited<ReturnType<typeof getSupabase>>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function renderLoggedIn() {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.getByTestId("user").textContent).toBe("yes");
    expect(screen.getByTestId("role").textContent).toBe("owner");
  }

  it("un SIGNED_OUT ajeno con la sesión viva en el almacenamiento NO bota al usuario", async () => {
    await renderLoggedIn();
    // Llega un SIGNED_OUT que el usuario no pidió (otra ventana, tardío…).
    await act(async () => {
      state.authCallback?.("SIGNED_OUT", null);
    });
    // Durante la ventana de confirmación el usuario SIGUE dentro.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByTestId("user").textContent).toBe("yes");
    // La confirmación relee la sesión (sigue viva) y restaura: no hay salida.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByTestId("user").textContent).toBe("yes");
    expect(screen.getByTestId("role").textContent).toBe("owner");
  });

  it("un SIGNED_OUT real (sin sesión ni token guardado) SÍ cierra la sesión", async () => {
    await renderLoggedIn();
    // La sesión murió de verdad: getSession ya no devuelve nada y no
    // queda token en el almacenamiento (jsdom arranca vacío).
    state.session = null;
    await act(async () => {
      state.authCallback?.("SIGNED_OUT", null);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByTestId("user").textContent).toBe("no");
    expect(screen.getByTestId("role").textContent).toBe("user");
  });

  it("el cierre pedido con el botón de salir se honra al instante, sin confirmación", async () => {
    await renderLoggedIn();
    fireEvent.click(screen.getByText("out"));
    // Sin esperar la ventana de confirmación (900 ms): ya está fuera.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(screen.getByTestId("user").textContent).toBe("no");
  });
});

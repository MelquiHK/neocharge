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
const state = { rolesCalls: 0, rolesFailTimes: 0 };

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
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: () => Promise.resolve({ data: { session: fakeSession } }),
      signOut: vi.fn(),
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
      <button onClick={auth.retryAuthData}>retry</button>
    </div>
  );
}

describe("AuthProvider — carga de roles ante fallos de red", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state.rolesCalls = 0;
    state.rolesFailTimes = 0;
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

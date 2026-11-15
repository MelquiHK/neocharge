import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Auth from "./Auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ---------- Mocks ----------
   Se prueba el botón «Continuar con Google» de /auth: que exista, que
   llame a Supabase OAuth con el proveedor y el redirect correctos, y
   que un fallo se le anuncie al cliente sin romper la página. */

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/use-seo", () => ({ useSEO: vi.fn() }));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockOAuth = vi.mocked(supabase.auth.signInWithOAuth);

function renderAuth() {
  return render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Auth />
    </MemoryRouter>,
  );
}

describe("Auth — Entrar con Google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOAuth.mockResolvedValue({ data: {}, error: null } as never);
  });

  it("muestra el botón «Continuar con Google»", () => {
    renderAuth();
    expect(
      screen.getByRole("button", { name: /continuar con google/i }),
    ).toBeInTheDocument();
  });

  it("al tocarlo llama a Supabase OAuth con provider google y redirect a /cuenta", async () => {
    renderAuth();
    fireEvent.click(
      screen.getByRole("button", { name: /continuar con google/i }),
    );
    await waitFor(() => expect(mockOAuth).toHaveBeenCalledTimes(1));
    expect(mockOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/cuenta` },
    });
  });

  it("si Supabase devuelve error, avisa al cliente y el botón se recupera", async () => {
    mockOAuth.mockResolvedValue({
      data: {},
      error: new Error("provider is not enabled"),
    } as never);
    renderAuth();
    const btn = screen.getByRole("button", { name: /continuar con google/i });
    fireEvent.click(btn);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("No se pudo iniciar con Google"),
      ),
    );
    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});

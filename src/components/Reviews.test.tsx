import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import { Reviews } from "./Reviews";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/* ---------- Mocks ---------- */

const reviewRows = [
  {
    id: "r1",
    product_id: "p1",
    user_id: "u1",
    order_id: "o1",
    rating: 5,
    title: "Excelente cargador",
    body: "Carga rápido y no se calienta.",
    verified: true,
    helpful_count: 0,
    created_at: "2026-10-05T12:00:00.000Z",
    updated_at: "2026-10-05T12:00:00.000Z",
  },
  {
    id: "r2",
    product_id: "p1",
    user_id: "u2",
    order_id: null,
    rating: 4,
    title: null,
    body: "Bueno, llegó rápido.",
    verified: false,
    helpful_count: 0,
    created_at: "2026-10-04T12:00:00.000Z",
    updated_at: "2026-10-04T12:00:00.000Z",
  },
];

const profileRows = [
  { id: "u1", full_name: "Ana Pérez", username: "ana" },
  { id: "u2", full_name: null, username: "cliente42" },
];

/** Query builder encadenable y "awaitable" (thenable). */
type Chain = Record<string, ReturnType<typeof vi.fn> | ((v: unknown) => void)>;

function createChain(result: { data: unknown; error: null }): Chain {
  const chain = {} as Chain;
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  for (const m of ["select", "eq", "order", "in", "insert", "update", "delete"]) {
    chain[m] = vi.fn(() => chain);
  }
  return chain;
}

/** Datos que devuelve cada tabla; cada test los ajusta. */
let tableData: Record<string, unknown[]> = {};

const createdChains: { table: string; chain: Chain }[] = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain = createChain({ data: tableData[table] ?? [], error: null });
      createdChains.push({ table, chain });
      return chain;
    }),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockFrom = vi.mocked(supabase.from);

function insertCalls(): unknown[][] {
  return createdChains
    .filter((c) => c.table === "reviews")
    .flatMap((c) => (c.chain.insert as ReturnType<typeof vi.fn>).mock.calls);
}

function mockLoggedOut() {
  mockUseAuth.mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
}

function mockLoggedIn(userId = "u1") {
  mockUseAuth.mockReturnValue({
    user: { id: userId, email: "ana@example.com" },
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.clearAllMocks();
  createdChains.length = 0;
  tableData = { reviews: reviewRows, profiles: profileRows };
});

/* ---------- Tests ---------- */

describe("Reviews", () => {
  it("muestra el estado vacío cuando no hay reseñas", async () => {
    mockLoggedOut();
    tableData = { reviews: [], profiles: [] };

    render(<Reviews productId="p1" />);

    expect(await screen.findByText("Aún no hay reseñas")).toBeInTheDocument();
    expect(screen.getByText("Sin reseñas todavía")).toBeInTheDocument();
    // Sin login: no hay formulario, solo la invitación a entrar.
    expect(
      screen.getByText("Inicia sesión para dejar tu reseña sobre este producto."),
    ).toBeInTheDocument();
  });

  it("muestra promedio, distribución, nombres y badge de compra verificada", async () => {
    mockLoggedIn("u3"); // otro usuario: no es dueño de ninguna reseña

    render(<Reviews productId="p1" productName="Cargador 72V" />);

    // Promedio (5+4)/2 = 4.5
    expect(await screen.findByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("2 reseñas")).toBeInTheDocument();

    // Distribución: barras con aria-label por estrellas
    expect(screen.getByLabelText("1 reseñas de 5 estrellas")).toBeInTheDocument();
    expect(screen.getByLabelText("1 reseñas de 4 estrellas")).toBeInTheDocument();

    // Nombres desde profiles (full_name, o username si no hay)
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("cliente42")).toBeInTheDocument();

    // Solo la reseña verificada lleva el badge
    const badges = screen.getAllByText("Compra verificada");
    expect(badges).toHaveLength(1);
    const verifiedCard = screen.getByText("Excelente cargador").closest("article")!;
    expect(within(verifiedCard).getByText("Compra verificada")).toBeInTheDocument();

    // Contenido de las reseñas
    expect(screen.getByText("Carga rápido y no se calienta.")).toBeInTheDocument();
  });

  it("el dueño ve su reseña marcada y puede editarla", async () => {
    mockLoggedIn("u1");

    render(<Reviews productId="p1" />);

    expect(await screen.findByText("(tu reseña)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar/i })).toBeInTheDocument();
  });

  it("un logueado sin reseña puede publicar una nueva", async () => {
    mockLoggedIn("u9");
    tableData = { reviews: [], profiles: [] };

    render(<Reviews productId="p1" />);

    fireEvent.click(await screen.findByRole("button", { name: /primera reseña/i }));
    fireEvent.click(screen.getByRole("radio", { name: "5 estrellas" }));
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Muy bueno" } });
    fireEvent.change(screen.getByLabelText(/tu opinión/i), {
      target: { value: "Funciona perfecto en mi moto." },
    });
    fireEvent.click(screen.getByRole("button", { name: /publicar reseña/i }));

    await waitFor(() => {
      expect(insertCalls()).toHaveLength(1);
    });
    expect(insertCalls()[0][0]).toEqual({
      product_id: "p1",
      user_id: "u9",
      rating: 5,
      title: "Muy bueno",
      body: "Funciona perfecto en mi moto.",
    });
  });

  it("no rompe la ficha si la tabla aún no existe en vivo", async () => {
    mockLoggedOut();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFrom.mockImplementation(((() => {
      throw new Error("relation does not exist");
    }) as unknown) as typeof supabase.from);

    render(<Reviews productId="p1" />);

    // El componente captura el error y muestra el estado vacío.
    expect(await screen.findByText("Aún no hay reseñas")).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});

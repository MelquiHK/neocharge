import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Admin from "./Admin";
import { useAuth } from "@/hooks/use-auth";

/* ---------- Mocks ----------
   Solo se prueba el cascarón del panel (Admin.tsx): la autenticación se
   simula y las secciones hijas se sustituyen por marcadores. */

vi.mock("@/hooks/use-auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/use-seo", () => ({ useSEO: vi.fn() }));
vi.mock("@/hooks/admin/use-order-notifications", () => ({
  useOrderNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAllAsRead: vi.fn(),
  }),
}));

vi.mock("@/components/admin/AdminDashboard", () => ({ AdminDashboard: () => <div>dashboard-mock</div> }));
vi.mock("@/components/admin/AdminProducts", () => ({ AdminProducts: () => <div>products-mock</div> }));
vi.mock("@/components/admin/AdminCategories", () => ({ AdminCategories: () => <div>categories-mock</div> }));
vi.mock("@/components/admin/AdminLocations", () => ({ AdminLocations: () => <div>locations-mock</div> }));
vi.mock("@/components/admin/AdminSocios", () => ({ AdminSocios: () => <div>socios-mock</div> }));
vi.mock("@/components/admin/AdminOrders", () => ({ AdminOrders: () => <div>orders-mock</div> }));
vi.mock("@/components/admin/AdminCustomers", () => ({ AdminCustomers: () => <div>customers-mock</div> }));
vi.mock("@/components/admin/AdminRates", () => ({ AdminRates: () => <div>rates-mock</div> }));
vi.mock("@/components/admin/AdminBlog", () => ({ AdminBlog: () => <div>blog-mock</div> }));
vi.mock("@/components/admin/AdminSales", () => ({ AdminSales: () => <div>sales-mock</div> }));
vi.mock("@/components/admin/AdminReferrals", () => ({ AdminReferrals: () => <div>referrals-mock</div> }));
vi.mock("@/components/admin/AdminAnalytics", () => ({ AdminAnalytics: () => <div>analytics-mock</div> }));
vi.mock("@/components/admin/AdminCashbox", () => ({ AdminCashbox: () => <div>cashbox-mock</div> }));
vi.mock("@/components/admin/AdminServices", () => ({ AdminServices: () => <div>services-mock</div> }));
vi.mock("@/components/admin/AdminMessenger", () => ({ AdminMessenger: () => <div>messenger-mock</div> }));
vi.mock("@/components/admin/AdminSettings", () => ({ AdminSettings: () => <div>settings-mock</div> }));

const fullPermissions = {
  is_owner: true,
  can_manage_orders: true,
  can_view_finances: true,
  can_manage_customers: true,
  can_manage_products: true,
  can_manage_blog: true,
  can_manage_rates: true,
  can_manage_locations: true,
  can_manage_admins: true,
};

describe("Admin — montaje en frío (regresión del error de React #310)", () => {
  it("no rompe cuando la sesión se resuelve después del primer render", () => {
    const mockUseAuth = vi.mocked(useAuth);

    // Primer render: la sesión aún se está resolviendo (entrada directa
    // o recarga en /admin). El panel pinta la pantalla de carga y sale
    // por el retorno temprano.
    mockUseAuth.mockReturnValue({
      user: null,
      isAdmin: false,
      permissions: fullPermissions,
      loading: true,
      authDataReady: false,
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    const { rerender } = render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );
    expect(screen.getByText(/Abriendo tu panel/)).toBeInTheDocument();

    // La sesión se resuelve como dueño: el siguiente render ejecuta el
    // componente completo. Si algún hook quedara tras los retornos
    // tempranos, React lanzaría «Rendered more hooks than during the
    // previous render» (#310) y este render explotaría.
    mockUseAuth.mockReturnValue({
      user: { email: "mel@neocharge.cu" },
      isAdmin: true,
      permissions: fullPermissions,
      loading: false,
      authDataReady: true,
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    rerender(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText("dashboard-mock")).toBeInTheDocument();
    expect(screen.getByText("NeoCharge")).toBeInTheDocument();
  });

  it("sesión válida pero permisos sin cargar: ofrece Reintentar, no «Acceso restringido»", () => {
    const mockUseAuth = vi.mocked(useAuth);
    // El caso del «me bota de mi usuario»: hay sesión, pero la carga de
    // roles/permisos falló por red (authDataFailed). La guardia debe
    // distinguirlo de un usuario sin privilegios de verdad.
    mockUseAuth.mockReturnValue({
      user: { email: "melcraft96@gmail.com" },
      isAdmin: false,
      permissions: fullPermissions,
      loading: false,
      authDataReady: true,
      authDataFailed: true,
      retryAuthData: vi.fn(),
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText(/No se pudo cargar tu sesión/)).toBeInTheDocument();
    expect(screen.getByText("Reintentar")).toBeInTheDocument();
    expect(screen.queryByText(/Acceso restringido/)).not.toBeInTheDocument();
  });

  it("sin fallo de carga y sin privilegios: sí muestra «Acceso restringido»", () => {
    const mockUseAuth = vi.mocked(useAuth);
    mockUseAuth.mockReturnValue({
      user: { email: "cliente@example.com" },
      isAdmin: false,
      permissions: fullPermissions,
      loading: false,
      authDataReady: true,
      authDataFailed: false,
      retryAuthData: vi.fn(),
      signOut: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <Admin />
      </MemoryRouter>
    );

    expect(screen.getByText(/Acceso restringido/)).toBeInTheDocument();
    expect(screen.queryByText("Reintentar")).not.toBeInTheDocument();
  });
});

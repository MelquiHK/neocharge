import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SiteLayout } from "@/components/SiteLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TrafficTracker } from "@/components/TrafficTracker";
import { Spinner } from "@/components/ui/spinner";

// Core pages (loaded upfront - essential for first paint)
import Index from "./pages/Index.tsx";
import Shop from "./pages/Shop.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import NotFound from "./pages/NotFound.tsx";

// Lazy-loaded pages (code-split by route)
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const BlogPost = lazy(() => import("./pages/BlogPost.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Services = lazy(() => import("./pages/Services.tsx"));
const Garantia = lazy(() => import("./pages/Garantia.tsx"));
const FAQ = lazy(() => import("./pages/FAQ.tsx"));
const LegalTerms = lazy(() => import("./pages/LegalTerms.tsx"));
const LegalPrivacy = lazy(() => import("./pages/LegalPrivacy.tsx"));

// Loading placeholder component
const LoadingPlaceholder = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Spinner />
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <ScrollToTop />
          <TrafficTracker />
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route element={<SiteLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/tienda" element={<Shop />} />
                  <Route path="/producto/:slug" element={<ProductDetail />} />
                  <Route path="/checkout" element={<Suspense fallback={<LoadingPlaceholder />}><Checkout /></Suspense>} />
                  <Route path="/auth" element={<Suspense fallback={<LoadingPlaceholder />}><Auth /></Suspense>} />
                  <Route path="/cuenta" element={<Suspense fallback={<LoadingPlaceholder />}><Account /></Suspense>} />
                  <Route path="/sobre-nosotros" element={<Suspense fallback={<LoadingPlaceholder />}><About /></Suspense>} />
                  <Route path="/contacto" element={<Suspense fallback={<LoadingPlaceholder />}><Contact /></Suspense>} />
                  <Route path="/blog" element={<Suspense fallback={<LoadingPlaceholder />}><Blog /></Suspense>} />
                  <Route path="/blog/:slug" element={<Suspense fallback={<LoadingPlaceholder />}><BlogPost /></Suspense>} />
                  <Route path="/servicios" element={<Suspense fallback={<LoadingPlaceholder />}><Services /></Suspense>} />
                  <Route path="/admin" element={<Suspense fallback={<LoadingPlaceholder />}><Admin /></Suspense>} />
                  <Route path="/garantia" element={<Suspense fallback={<LoadingPlaceholder />}><Garantia /></Suspense>} />
                  <Route path="/preguntas-frecuentes" element={<Suspense fallback={<LoadingPlaceholder />}><FAQ /></Suspense>} />
                  <Route path="/envios-y-garantia" element={<Suspense fallback={<LoadingPlaceholder />}><Garantia /></Suspense>} />
                  <Route path="/legales/terminos" element={<Suspense fallback={<LoadingPlaceholder />}><LegalTerms /></Suspense>} />
                  <Route path="/legales/privacidad" element={<Suspense fallback={<LoadingPlaceholder />}><LegalPrivacy /></Suspense>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

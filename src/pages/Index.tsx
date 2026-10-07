import { Suspense, lazy } from "react";
import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { useSEO } from "@/hooks/use-seo";
import "@/components/sections/visual-effects.css";

// Secciones below-fold: no hacen falta en el primer paint, así que viajan en
// chunks asíncronos. Hero y TrustStrip siguen en el bundle inicial.
const FeaturedProducts = lazy(() =>
  import("@/components/sections/FeaturedProducts").then((m) => ({ default: m.FeaturedProducts })),
);
const Categories = lazy(() =>
  import("@/components/sections/Categories").then((m) => ({ default: m.Categories })),
);
const Features = lazy(() =>
  import("@/components/sections/Features").then((m) => ({ default: m.Features })),
);
const HowToBuy = lazy(() =>
  import("@/components/sections/HowToBuy").then((m) => ({ default: m.HowToBuy })),
);
const FAQ = lazy(() => import("@/components/sections/FAQ").then((m) => ({ default: m.FAQ })));
const CTA = lazy(() => import("@/components/sections/CTA").then((m) => ({ default: m.CTA })));

const Index = () => {
  useSEO("home");

  return (
    <>
      <Hero />
      <TrustStrip />
      <Suspense fallback={null}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={null}>
        <Categories />
      </Suspense>
      <Suspense fallback={null}>
        <Features />
      </Suspense>
      <Suspense fallback={null}>
        <HowToBuy />
      </Suspense>
      <Suspense fallback={null}>
        <FAQ />
      </Suspense>
      <Suspense fallback={null}>
        <CTA />
      </Suspense>
    </>
  );
};

export default Index;

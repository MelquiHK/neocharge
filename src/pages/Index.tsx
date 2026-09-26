import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { Categories } from "@/components/sections/Categories";
import { Features } from "@/components/sections/Features";
import { HowToBuy } from "@/components/sections/HowToBuy";
import { FAQ } from "@/components/sections/FAQ";
import { CTA } from "@/components/sections/CTA";
import { Reveal } from "@/components/Reveal";
import { useSEO } from "@/hooks/use-seo";
import "@/components/sections/visual-effects.css";
import "@/components/sections/crystal.css";

const Index = () => {
  useSEO("home");

  return (
    <div className="cr-page">
      {/* Orbes pastel flotantes de la página */}
      <div className="cr-orb cr-orb-a" aria-hidden />
      <div className="cr-orb cr-orb-b" aria-hidden />
      <div className="cr-orb cr-orb-c" aria-hidden />

      <Reveal delay={0}>
        <Hero />
      </Reveal>
      <Reveal delay={1}>
        <TrustStrip />
      </Reveal>
      <Reveal delay={1}>
        <FeaturedProducts />
      </Reveal>
      <Reveal delay={2}>
        <Categories />
      </Reveal>
      <Reveal delay={2}>
        <Features />
      </Reveal>
      <Reveal delay={3}>
        <HowToBuy />
      </Reveal>
      <Reveal delay={4}>
        <FAQ />
      </Reveal>
      <Reveal delay={5}>
        <CTA />
      </Reveal>
    </div>
  );
};

export default Index;

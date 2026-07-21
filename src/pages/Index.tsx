import { Hero } from "@/components/sections/Hero";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { FeaturedProducts } from "@/components/sections/FeaturedProducts";
import { Categories } from "@/components/sections/Categories";
import { Features } from "@/components/sections/Features";
import { Testimonials } from "@/components/sections/Testimonials";
import { FAQ } from "@/components/sections/FAQ";
import { CTA } from "@/components/sections/CTA";
import { useSEO } from "@/hooks/use-seo";

const Index = () => {
  useSEO("home");

  return (
    <>
      <Hero />
      <TrustStrip />
      <FeaturedProducts />
      <Categories />
      <Features />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  );
};

export default Index;

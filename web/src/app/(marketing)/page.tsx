import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Curriculum } from "@/components/landing/curriculum";
import { PlaygroundTeaser } from "@/components/landing/playground-teaser";
import { Safety } from "@/components/landing/safety";
import { Pricing } from "@/components/landing/pricing";
import { Founder } from "@/components/landing/founder";
import { Faq } from "@/components/landing/faq";
import { ClosingCta } from "@/components/landing/closing-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Curriculum />
      <PlaygroundTeaser />
      <Safety />
      <Pricing />
      <Founder />
      <Faq />
      <ClosingCta />
    </>
  );
}

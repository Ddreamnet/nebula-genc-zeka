import { Hero } from "@/components/landing/hero";
import { Curriculum } from "@/components/landing/curriculum";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PlaygroundTeaser } from "@/components/landing/playground-teaser";
import { Safety } from "@/components/landing/safety";
import { ClosingCta } from "@/components/landing/closing-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Curriculum />
      <HowItWorks />
      <PlaygroundTeaser />
      <Safety />
      <ClosingCta />
    </>
  );
}

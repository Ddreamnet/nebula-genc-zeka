import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { Curriculum } from "@/components/landing/curriculum";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PlaygroundTeaser } from "@/components/landing/playground-teaser";
import { Newsletter } from "@/components/landing/newsletter";
import { Safety } from "@/components/landing/safety";
import { ClosingCta } from "@/components/landing/closing-cta";
import { faqs } from "@/lib/faq";
import { JsonLd, canonical, courseLd, faqLd } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: canonical("/"),
};

export default function HomePage() {
  return (
    <>
      {/* Course + FAQPage. The organization and website nodes are emitted once
          for the whole marketing tree by (marketing)/layout.tsx; these two are
          about this page specifically, so they live here. Both describe copy
          that is visible on the page — Google rejects marked-up answers that
          a visitor cannot read. */}
      <JsonLd data={[courseLd, faqLd(faqs)]} />

      {/* The hero carries its own --nb-scale (0.8). */}
      <Hero />

      {/* Everything below the hero is drawn 10% down from the size the
          sections were designed at. One wrapper rather than a class on each
          section, so the six bands can never drift out of step with each
          other; the sections still fill the viewport's width because `zoom`
          re-lays them out rather than scaling a finished box. */}
      <div className="nb-scale" style={{ "--nb-scale": 0.9 } as React.CSSProperties}>
        <Curriculum />
        <HowItWorks />
        <PlaygroundTeaser />
        <Newsletter />
        <Safety />
        <ClosingCta />
      </div>
    </>
  );
}

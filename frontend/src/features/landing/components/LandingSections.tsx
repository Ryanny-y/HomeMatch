import { MotionRoot } from "@/components/motion/MotionRoot";
import { StructuredData } from "@/components/StructuredData";
import { Comparison } from "@/features/landing/components/Comparison";
import { Coverage } from "@/features/landing/components/Coverage";
import { Faq } from "@/features/landing/components/Faq";
import { FinalCta } from "@/features/landing/components/FinalCta";
import { ForLandlords } from "@/features/landing/components/ForLandlords";
import { Hero } from "@/features/landing/components/Hero";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { MatchScore } from "@/features/landing/components/MatchScore";
import { Problem } from "@/features/landing/components/Problem";
import { Solution } from "@/features/landing/components/Solution";
import { SupportingFeatures } from "@/features/landing/components/SupportingFeatures";
import { TrueCost } from "@/features/landing/components/TrueCost";
import { landingJsonLd } from "@/features/landing/structured-data";

/**
 * The whole marketing surface, in the order the brief specifies.
 *
 * The structured data ships from here rather than from the route, because it
 * describes this content — keeping them together means adding an FAQ entry
 * cannot silently desynchronise the FAQPage schema from what the page renders.
 *
 * `MotionRoot` is scoped to this surface rather than to the root layout: the
 * scroll entrances only exist here, so the auth screens ship none of Motion.
 * Every section below stays a Server Component — they are passed through as
 * children, so the client boundary is the provider and the small reveal
 * wrappers, not the page.
 */
export function LandingSections() {
  return (
    <>
      {landingJsonLd().map((schema) => (
        <StructuredData key={String(schema["@id"])} data={schema} />
      ))}

      <MotionRoot>
        <main id="main" className="flex-1">
          <Hero />
          <Problem />
          <Solution />
          <MatchScore />
          <TrueCost />
          <Comparison />
          <SupportingFeatures />
          <HowItWorks />
          <ForLandlords />
          <Coverage />
          <Faq />
          <FinalCta />
        </main>
      </MotionRoot>
    </>
  );
}

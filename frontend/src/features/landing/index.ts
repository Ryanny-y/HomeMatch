/**
 * Public surface of the landing feature. Anything not exported here is
 * internal — routes compose `LandingSections`, they don't reach into the
 * individual sections.
 */
export { LandingSections } from "@/features/landing/components/LandingSections";
export { landingJsonLd } from "@/features/landing/structured-data";
export { FAQ, type FaqEntry } from "@/features/landing/faq";

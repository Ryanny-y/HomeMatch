import { FAQ } from "@/features/landing/faq";
import { SITE } from "@/lib/site";

/**
 * JSON-LD for the landing page: Organization, WebSite, and FAQPage.
 *
 * The FAQPage entries are derived from the same `FAQ` array the accordion
 * renders, so the structured data can never advertise an answer the page does
 * not actually show.
 */
export function landingJsonLd(): Record<string, unknown>[] {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    slogan: SITE.tagline,
    areaServed: {
      "@type": "City",
      name: "Quezon City",
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: "Metro Manila, Philippines",
      },
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE.contactEmail,
      areaServed: "PH",
      availableLanguage: ["English", "Filipino"],
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: "en-PH",
    publisher: { "@id": `${SITE.url}/#organization` },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE.url}/#faq-page`,
    mainEntity: FAQ.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return [organization, website, faqPage];
}

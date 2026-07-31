/**
 * FAQ content, shared by the accordion and the FAQPage JSON-LD on the landing
 * page. Answers are plain strings on purpose: structured data must carry the
 * same text a reader sees, and keeping one source makes that automatic rather
 * than a thing someone has to remember to update twice.
 */

export type FaqEntry = {
  question: string;
  answer: string;
  /** Optional follow-on action rendered under the answer in the accordion. */
  link?: { label: string; href: string };
};

export const FAQ: readonly FaqEntry[] = [
  {
    question: "Is HomeMatch free for renters?",
    answer:
      "Yes. Searching, match scores, true monthly cost, saving listings, and comparisons are all free for renters, and we don't take a cut of your rent or deposit. We make money from landlords and property managers later — never by charging you to see a number you need to make a decision.",
  },
  {
    question: "Where do the listings come from?",
    answer:
      "Landlords and property managers post them directly, and we seed the catalog ourselves from units we've found and confirmed around Quezon City. Nothing is scraped. Every listing is checked by a person, and its cost, commute, and neighborhood fields are filled in by hand before it goes live.",
  },
  {
    question: "How is the match score calculated?",
    answer:
      "A deterministic rules engine compares your profile — budget, work or school location, transport mode, pets, parking, household size — against the listing's real recorded fields, and produces a score out of 100. The AI's only job is to write the explanation in readable English. It never invents a reason, and it can't cite anything that isn't stored on the listing, which is why every line on a score card points back to a specific field.",
  },
  {
    question: "How accurate are the cost estimates?",
    answer:
      "Rent, parking, association dues, and internet are taken from what the landlord reports, so they're as accurate as the listing. Utilities are an estimate based on unit size and typical Meralco and Maynilad usage for the stated household size, and we label them as estimates everywhere they appear. Your actual bill will move with how you live. Move-in cost covers non-refundable items only — your deposit isn't counted as a cost, because you get it back.",
  },
  {
    question: "Do you handle payments, contracts, or deposits?",
    answer:
      "No. HomeMatch helps you decide; you transact directly with the landlord. We don't hold deposits, process rent, draft contracts, or act as an agent. Once you've chosen a place, the agreement is between you and the owner — always view the unit and read the contract before you pay anything.",
  },
  {
    question: "Which areas do you cover?",
    answer:
      "Quezon City for version one, including Sikatuna Village, Katipunan, Cubao, Diliman, Project areas, and Libis. Expansion across the rest of Metro Manila is planned. We'd rather be genuinely useful in one city than thin across five.",
  },
  {
    question: "I'm a landlord — how do I list?",
    answer:
      "Create a landlord account and add your unit with its rent, parking, utilities, dues, and building rules. Listing is free during launch. The more cost and location detail you fill in, the better we can match your unit to renters it actually suits — which means fewer viewings that go nowhere.",
    link: { label: "List your property", href: "/signup?role=landlord" },
  },
];

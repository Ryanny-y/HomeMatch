/**
 * The illustrative unit used across the landing page.
 *
 * This is static demo data rendered as UI — it never calls the API. It lives
 * in one module so the figures agree everywhere they appear: the ₱22,000 rent
 * in the hero, the "within budget" criterion on the match score card, and the
 * first line of the true-cost breakdown are all the same number by
 * construction. A page arguing that the numbers matter cannot afford to
 * contradict itself between two sections.
 */

import type { Criterion } from "@/components/product/CriteriaList";

/** Each category owns a colour and an icon everywhere it appears. */
export type CostCategory =
  | "rent"
  | "parking"
  | "utilities"
  | "internet"
  | "dues"
  | "movein";

export type CostLine = {
  category: CostCategory;
  label: string;
  note?: string;
  amount: number;
};

const COST_LINES: readonly CostLine[] = [
  { category: "rent", label: "Rent", amount: 22_000 },
  { category: "parking", label: "Parking", amount: 2_500 },
  {
    category: "utilities",
    label: "Utilities (est.)",
    note: "Meralco + Maynilad, two occupants",
    amount: 3_500,
  },
  { category: "internet", label: "Internet", amount: 1_699 },
  { category: "dues", label: "Association dues", amount: 1_200 },
  {
    category: "movein",
    label: "Move-in cost, amortized",
    note: "Over 12 months",
    amount: 3_600,
  },
];

const TRUE_MONTHLY_COST = COST_LINES.reduce((sum, line) => sum + line.amount, 0);

export const SAMPLE_UNIT = {
  unitType: "1BR · 38 sqm",
  barangay: "Barangay Sikatuna Village",
  city: "Quezon City",
  advertisedRent: 22_000,
  renterBudget: 25_000,
  matchScore: 94,
  costLines: COST_LINES,
  trueMonthlyCost: TRUE_MONTHLY_COST,
} as const;

/** Rendered verbatim on the AI Match Score card. */
export const SAMPLE_CRITERIA: readonly Criterion[] = [
  { kind: "pass", text: "Within budget (₱22,000 of ₱25,000)" },
  { kind: "pass", text: "12 minutes to Katipunan by car" },
  { kind: "pass", text: "Pet-friendly" },
  { kind: "pass", text: "Parking included" },
  { kind: "tradeoff", text: "Utilities not included (~₱3,500/mo)" },
];

export type ComparisonUnit = {
  name: string;
  location: string;
  trueCost: number;
  points: readonly Criterion[];
};

export const SAMPLE_COMPARISON: readonly [ComparisonUnit, ComparisonUnit] = [
  {
    name: "Unit A",
    location: "Sikatuna Village",
    trueCost: 34_499,
    points: [
      { kind: "pass", text: "₱4,000 cheaper all-in" },
      { kind: "pass", text: "8 min to work" },
      { kind: "tradeoff", text: "Older building, no elevator" },
    ],
  },
  {
    name: "Unit B",
    location: "Katipunan Ave",
    trueCost: 38_499,
    points: [
      { kind: "pass", text: "Newer building, gym access" },
      { kind: "pass", text: "Utilities included" },
      { kind: "tradeoff", text: "25 min commute at rush hour" },
    ],
  },
];

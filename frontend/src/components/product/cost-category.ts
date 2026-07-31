import type { CostCategory } from "@/lib/sample-listing";

/**
 * One place binding each cost category to its colour.
 *
 * This is what keeps the six hues meaningful rather than decorative: the violet
 * dot beside "Parking" in the itemised list and the violet segment in the
 * composition bar are the same fact rendered twice, and neither can drift from
 * the other because both read from here.
 *
 * That claim only holds if these hues appear nowhere else, so they don't — see
 * the colour contract in `globals.css`. This file previously also carried a
 * `chip` per category (`bg-violet-50 text-violet-700`) and an `icon`; nothing
 * ever rendered either, and the chips were raw Tailwind values that no longer
 * match the tokens at all under Tailwind 4. Both are gone.
 *
 * Classes are written out in full because Tailwind scans source text — a
 * template literal like `bg-cat-${key}` would never be generated.
 */

export type CategoryStyle = {
  label: string;
  /** Solid fill — bar segments and dots. The only colour a category has. */
  fill: string;
};

export const COST_CATEGORY: Record<CostCategory, CategoryStyle> = {
  rent: { label: "Rent", fill: "bg-cat-rent" },
  parking: { label: "Parking", fill: "bg-cat-parking" },
  utilities: { label: "Utilities", fill: "bg-cat-utilities" },
  internet: { label: "Internet", fill: "bg-cat-internet" },
  dues: { label: "Association dues", fill: "bg-cat-dues" },
  movein: { label: "Move-in", fill: "bg-cat-movein" },
};

import type { IconType } from "react-icons";
import {
  PiBuildings,
  PiCarSimple,
  PiHouseLine,
  PiKey,
  PiLightning,
  PiWifiHigh,
} from "react-icons/pi";

import type { CostCategory } from "@/lib/sample-listing";

/**
 * One place binding each cost category to its colour and icon.
 *
 * This is what keeps the extra hues meaningful rather than decorative: the
 * violet dot beside "Parking" in the itemised list and the violet segment in
 * the composition bar are the same fact rendered twice, and neither can drift
 * from the other because both read from here.
 *
 * Classes are written out in full because Tailwind scans source text — a
 * template literal like `bg-cat-${key}` would never be generated.
 */

export type CategoryStyle = {
  label: string;
  icon: IconType;
  /** Solid fill — bar segments and dots. */
  fill: string;
  /** Tinted chip background plus a readable foreground. */
  chip: string;
};

export const COST_CATEGORY: Record<CostCategory, CategoryStyle> = {
  rent: {
    label: "Rent",
    icon: PiHouseLine,
    fill: "bg-cat-rent",
    chip: "bg-blue-50 text-blue-700",
  },
  parking: {
    label: "Parking",
    icon: PiCarSimple,
    fill: "bg-cat-parking",
    chip: "bg-violet-50 text-violet-700",
  },
  utilities: {
    label: "Utilities",
    icon: PiLightning,
    fill: "bg-cat-utilities",
    chip: "bg-amber-50 text-amber-700",
  },
  internet: {
    label: "Internet",
    icon: PiWifiHigh,
    fill: "bg-cat-internet",
    chip: "bg-cyan-50 text-cyan-700",
  },
  dues: {
    label: "Association dues",
    icon: PiBuildings,
    fill: "bg-cat-dues",
    chip: "bg-rose-50 text-rose-700",
  },
  movein: {
    label: "Move-in",
    icon: PiKey,
    fill: "bg-cat-movein",
    chip: "bg-orange-50 text-orange-700",
  },
};

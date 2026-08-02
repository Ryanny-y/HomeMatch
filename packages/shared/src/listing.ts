import { z } from "zod";

/**
 * The listing contract: enums, cost maths, and publish readiness.
 *
 * The cost calculator and the readiness rules live here rather than on either
 * side because both sides must reach the same answer. The API gates publishing
 * on readiness; the dashboard tells the landlord what is blocking it. Two
 * implementations would drift and the UI would start lying.
 */

export const propertyTypeSchema = z.enum(["condo", "apartment", "boarding_house"]);

/**
 * What is being rented, as distinct from what the building is.
 *
 * A boarding house rented per bed prices per bed; an apartment prices the whole
 * unit. Without this split `rent` is ambiguous and every derived cost figure is
 * wrong for boarding houses.
 */
export const listingTypeSchema = z.enum(["whole_unit", "bedspace"]);

export const listingStatusSchema = z.enum(["draft", "published", "archived"]);
export const bathroomAccessSchema = z.enum(["shared", "private"]);
export const genderPolicySchema = z.enum(["any", "male_only", "female_only"]);

/** How precisely the address resolved. A barangay centroid must not be scored as a rooftop. */
export const geocodePrecisionSchema = z.enum([
  "rooftop",
  "street",
  "barangay",
  "approximate",
]);

export type PropertyType = z.infer<typeof propertyTypeSchema>;
export type ListingType = z.infer<typeof listingTypeSchema>;
export type ListingStatus = z.infer<typeof listingStatusSchema>;
export type BathroomAccess = z.infer<typeof bathroomAccessSchema>;
export type GenderPolicy = z.infer<typeof genderPolicySchema>;
export type GeocodePrecision = z.infer<typeof geocodePrecisionSchema>;

// -------------------------------------------------------------------- cost ---

/**
 * The three lines a true monthly cost resolves to.
 *
 * Bound to `--color-cat-*` tokens under the colour contract in `globals.css`,
 * which still defines six because the landing page's illustrative breakdown
 * uses all six. A live listing resolves to these three: `other` takes
 * `--color-cat-dues`.
 *
 * Association dues, utilities, and internet were separate lines and separate
 * inputs. Asking a landlord for three numbers to reach one figure they think of
 * as one number cost more than the itemisation was worth, so they collapse into
 * `other`.
 */
export const COST_CATEGORIES = ["rent", "parking", "other"] as const;

export type CostCategory = (typeof COST_CATEGORIES)[number];

export type CostLine = {
  category: CostCategory;
  amount: number;
};

export type CostInput = {
  rent: number;
  otherFees: number | null;
  parkingAvailable: boolean;
  parkingCost: number | null;
};

/**
 * Every peso a renter actually pays per month, itemised.
 *
 * Deterministic by design — PRODUCT.md puts anything scored or priced in rules,
 * never in an LLM. Lines with no cost are omitted rather than shown as zero, so
 * the breakdown reflects what this unit charges rather than a fixed template.
 *
 * **Deposit and advance are deliberately absent.** They used to be amortised
 * over twelve months and folded in here, which made a ₱5,000 unit report ₱6,450
 * "per month" — a figure the landlord never typed, under a label that gave no
 * hint it had been derived. A one-time payment does not belong in a monthly
 * number however it is spread; the move-in total is a real cost, so it is shown
 * as its own figure rather than blended into this one. Do not add it back.
 */
export function computeTrueMonthlyCost(input: CostInput): CostLine[] {
  const candidates: CostLine[] = [
    { category: "rent", amount: input.rent },
    { category: "parking", amount: input.parkingAvailable ? (input.parkingCost ?? 0) : 0 },
    { category: "other", amount: input.otherFees ?? 0 },
  ];

  return candidates.filter((line) => line.amount > 0);
}

/** What a renter hands over before moving in. Never part of a monthly figure. */
export function moveInTotal(input: {
  rent: number;
  depositMonths: number;
  advanceMonths: number;
}): number {
  return input.rent * (input.depositMonths + input.advanceMonths);
}

export function totalMonthlyCost(lines: CostLine[]): number {
  return lines.reduce((sum, line) => sum + line.amount, 0);
}

// --------------------------------------------------------------- readiness ---

/**
 * A field a renter needs that this listing does not yet carry.
 *
 * `field` is the form field to jump to; `renterImpact` is what the renter loses
 * without it. The dashboard shows the impact, not the field name — a landlord
 * acts on "renters can't see your true monthly cost", not on "estUtilities is
 * null".
 */
export type ReadinessGap = {
  field: string;
  label: string;
  renterImpact: string;
};

export type ReadinessInput = {
  listingType: ListingType;
  description: string | null;
  lat: number | null;
  lng: number | null;
  barangay: string | null;
  rent: number | null;
  imageCount: number;
};

/**
 * What still blocks publication.
 *
 * The gate is deliberately about the fields that make a listing *decidable*,
 * not every field on the form. Enrichment is the product, so a listing that
 * cannot answer "what will this really cost me" or "where exactly is it" is not
 * ready to be seen — but floor level and pet policy, while useful, do not block.
 */
export function findReadinessGaps(input: ReadinessInput): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];

  if (!input.rent || input.rent <= 0) {
    gaps.push({
      field: "rent",
      label: "Monthly rent",
      renterImpact: "Renters can't see what this costs.",
    });
  }

  if (input.lat === null || input.lng === null) {
    gaps.push({
      field: "location",
      label: "Map location",
      renterImpact: "Renters can't work out the commute.",
    });
  }

  if (!input.barangay) {
    gaps.push({
      field: "barangay",
      label: "Barangay",
      renterImpact: "Renters can't tell which part of the city this is.",
    });
  }

  if (!input.description?.trim()) {
    gaps.push({
      field: "description",
      label: "Description",
      renterImpact: "Renters have nothing to read about the place.",
    });
  }

  if (input.imageCount === 0) {
    gaps.push({
      field: "images",
      label: "At least one photo",
      renterImpact: "Renters skip listings with no photos.",
    });
  }

  return gaps;
}

// ----------------------------------------------------------------- schemas ---

const optionalMoney = z.number().nonnegative().nullable().optional();
const optionalCount = z.number().int().nonnegative().nullable().optional();

/**
 * Creating a listing asks only for what identifies the unit.
 *
 * Everything else is optional here and becomes required at publish, which is
 * what lets a landlord save a draft in under a minute instead of facing
 * twenty-five inputs before anything persists.
 */
export const createListingSchema = z.object({
  title: z.string().trim().min(1, "Give this listing a title.").max(140),
  propertyType: propertyTypeSchema,
  listingType: listingTypeSchema,
  address: z.string().trim().min(1, "Enter the address."),
  rent: z.number().positive("Enter the monthly rent."),
});

export const updateListingSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  propertyType: propertyTypeSchema.optional(),
  listingType: listingTypeSchema.optional(),

  address: z.string().trim().min(1).optional(),
  barangay: z.string().trim().nullable().optional(),
  city: z.string().trim().optional(),
  province: z.string().trim().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  geocodeProvider: z.string().trim().nullable().optional(),
  externalPlaceId: z.string().trim().nullable().optional(),
  geocodePrecision: geocodePrecisionSchema.nullable().optional(),

  walkabilityNote: z.string().trim().nullable().optional(),

  bedrooms: optionalCount,
  bathrooms: optionalCount,
  bedsPerRoom: optionalCount,
  bathroomAccess: bathroomAccessSchema.nullable().optional(),
  floorLevel: optionalCount,
  totalFloors: optionalCount,

  rent: z.number().positive().optional(),
  depositMonths: z.number().int().min(0).max(12).optional(),
  advanceMonths: z.number().int().min(0).max(12).optional(),
  utilitiesIncluded: z.boolean().optional(),
  otherFees: optionalMoney,
  parkingAvailable: z.boolean().optional(),
  parkingCost: optionalMoney,

  petsAllowed: z.boolean().optional(),
  curfew: z.string().trim().nullable().optional(),
  genderPolicy: genderPolicySchema.nullable().optional(),
});

export const listingIdParamSchema = z.object({ id: z.uuid() });

export const listingImageConfirmSchema = z.object({
  storageKey: z.string().trim().min(1),
  isPrimary: z.boolean().optional(),
});

export const listingImagePresignSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingImageConfirmInput = z.infer<typeof listingImageConfirmSchema>;
export type ListingImagePresignInput = z.infer<typeof listingImagePresignSchema>;

export type ListingImageDto = {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
};

export type ListingDto = {
  id: string;
  slug: string;
  ownerId: string;
  status: ListingStatus;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  listingType: ListingType;

  address: string;
  barangay: string | null;
  city: string;
  province: string | null;
  lat: number | null;
  lng: number | null;
  geocodePrecision: GeocodePrecision | null;

  walkabilityNote: string | null;

  bedrooms: number | null;
  bathrooms: number | null;
  bedsPerRoom: number | null;
  bathroomAccess: BathroomAccess | null;
  floorLevel: number | null;
  totalFloors: number | null;

  rent: number;
  depositMonths: number;
  advanceMonths: number;
  utilitiesIncluded: boolean;
  otherFees: number | null;
  parkingAvailable: boolean;
  parkingCost: number | null;

  petsAllowed: boolean;
  curfew: string | null;
  genderPolicy: GenderPolicy | null;

  images: ListingImageDto[];

  createdAt: string;
  updatedAt: string;
};

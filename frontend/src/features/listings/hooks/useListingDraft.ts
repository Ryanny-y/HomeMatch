"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  BathroomAccess,
  GenderPolicy,
  GeocodePrecision,
  ReadinessGap,
  UpdateListingInput,
} from "@homematch/shared";
import { findReadinessGaps, updateListingSchema } from "@homematch/shared";
import type { Listing } from "@/features/listings/api/listings.api";

const REQUIRED_TEXT = ["title", "address", "city"] as const;
const NULLABLE_TEXT = ["description", "barangay", "curfew"] as const;

const REQUIRED_NUMBERS = ["rent", "depositMonths", "advanceMonths"] as const;
const NULLABLE_NUMBERS = [
  "otherFees",
  "parkingCost",
  "bedsPerRoom",
  "bedrooms",
  "bathrooms",
] as const;

const TEXT_FIELDS = [...REQUIRED_TEXT, ...NULLABLE_TEXT] as const;
const NUMBER_FIELDS = [...REQUIRED_NUMBERS, ...NULLABLE_NUMBERS] as const;

const FLAG_FIELDS = [
  "nearTransit",
  "utilitiesIncluded",
  "parkingAvailable",
  "furnished",
  "aircon",
  "petsAllowed",
] as const;

/** The pin and everything describing where it came from — they move together. */
const PIN_FIELDS = [
  "lat",
  "lng",
  "geocodePrecision",
  "geocodeProvider",
  "externalPlaceId",
] as const;

export type TextField = (typeof TEXT_FIELDS)[number];
export type NumberFieldName = (typeof NUMBER_FIELDS)[number];
export type FieldName = TextField | NumberFieldName;

export type Draft = Record<TextField, string> &
  Record<NumberFieldName, string> &
  Record<(typeof FLAG_FIELDS)[number], boolean> & {
    bathroomAccess: BathroomAccess | null;
    genderPolicy: GenderPolicy | null;
    lat: number | null;
    lng: number | null;
    geocodePrecision: GeocodePrecision | null;
    geocodeProvider: string | null;
    externalPlaceId: string | null;
  };

export type FieldErrors = Partial<Record<FieldName, string>>;

function numberToDraft(value: number | null): string {
  return value === null ? "" : String(value);
}

function toDraft(listing: Listing): Draft {
  return {
    title: listing.title,
    description: listing.description ?? "",
    address: listing.address,
    barangay: listing.barangay ?? "",
    city: listing.city,
    curfew: listing.curfew ?? "",

    rent: numberToDraft(listing.rent),
    depositMonths: numberToDraft(listing.depositMonths),
    advanceMonths: numberToDraft(listing.advanceMonths),
    otherFees: numberToDraft(listing.otherFees),
    parkingCost: numberToDraft(listing.parkingCost),
    bedsPerRoom: numberToDraft(listing.bedsPerRoom),
    bedrooms: numberToDraft(listing.bedrooms),
    bathrooms: numberToDraft(listing.bathrooms),

    nearTransit: listing.nearTransit,
    utilitiesIncluded: listing.utilitiesIncluded,
    parkingAvailable: listing.parkingAvailable,
    furnished: listing.furnished,
    aircon: listing.aircon,
    petsAllowed: listing.petsAllowed,

    bathroomAccess: listing.bathroomAccess,
    genderPolicy: listing.genderPolicy,

    lat: listing.lat,
    lng: listing.lng,
    geocodePrecision: listing.geocodePrecision,
    geocodeProvider: null,
    externalPlaceId: null,
  };
}

/**
 * A number field's three states, kept apart.
 *
 * Empty is a legitimate answer meaning "clear this" for an optional field, and
 * it must not be confused with text that failed to parse — the first saves, the
 * second is an error the landlord has to see.
 */
function parseNumber(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : "invalid";
}

/** Fields the schema will not accept as empty. */
const REQUIRED: ReadonlySet<FieldName> = new Set<FieldName>([
  ...REQUIRED_TEXT,
  ...REQUIRED_NUMBERS,
]);

const REQUIRED_MESSAGE: Partial<Record<FieldName, string>> = {
  title: "Give this listing a title.",
  address: "Enter the address.",
  city: "Enter the city.",
  rent: "Enter the monthly rent.",
  depositMonths: "Enter how many months' deposit.",
  advanceMonths: "Enter how many months' advance.",
};

function changedFields(draft: Draft, saved: Draft): (keyof Draft)[] {
  return (Object.keys(draft) as (keyof Draft)[]).filter(
    (field) => draft[field] !== saved[field],
  );
}

/**
 * Validates the draft, returning one message per bad field.
 *
 * The rules come from `updateListingSchema` in the shared package, so the
 * message beside an input is the string the API would have answered with and
 * there is no second copy of a rule to drift.
 */
function validate(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};

  for (const field of NUMBER_FIELDS) {
    const parsed = parseNumber(draft[field]);

    if (parsed === "invalid") errors[field] = "Enter a number, zero or more.";
    else if (parsed === null && REQUIRED.has(field)) {
      errors[field] = REQUIRED_MESSAGE[field];
    }
  }

  for (const field of TEXT_FIELDS) {
    if (REQUIRED.has(field) && draft[field].trim() === "") {
      errors[field] = REQUIRED_MESSAGE[field];
    }
  }

  const result = updateListingSchema.safeParse(toPayload(draft, Object.keys(draft) as (keyof Draft)[]));

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field as FieldName]) {
        errors[field as FieldName] = issue.message;
      }
    }
  }

  return errors;
}

function toPayload(draft: Draft, fields: readonly (keyof Draft)[]): UpdateListingInput {
  const payload: UpdateListingInput = {};
  const wanted = new Set(fields);

  for (const field of REQUIRED_TEXT) {
    if (!wanted.has(field)) continue;

    const trimmed = draft[field].trim();
    if (trimmed !== "") payload[field] = trimmed;
  }

  for (const field of NULLABLE_TEXT) {
    if (!wanted.has(field)) continue;

    const trimmed = draft[field].trim();
    payload[field] = trimmed === "" ? null : trimmed;
  }

  for (const field of REQUIRED_NUMBERS) {
    if (!wanted.has(field)) continue;

    const value = parseNumber(draft[field]);
    if (typeof value === "number") payload[field] = value;
  }

  for (const field of NULLABLE_NUMBERS) {
    if (!wanted.has(field)) continue;

    const value = parseNumber(draft[field]);
    if (value !== "invalid") payload[field] = value;
  }

  for (const field of FLAG_FIELDS) {
    if (wanted.has(field)) payload[field] = draft[field];
  }

  if (wanted.has("bathroomAccess")) payload.bathroomAccess = draft.bathroomAccess;
  if (wanted.has("genderPolicy")) payload.genderPolicy = draft.genderPolicy;

  // The pin travels whole. Sending `lat` without `geocodePrecision` would leave
  // a row claiming rooftop accuracy for coordinates that have since moved.
  if (PIN_FIELDS.some((field) => wanted.has(field))) {
    payload.lat = draft.lat;
    payload.lng = draft.lng;
    payload.geocodePrecision = draft.geocodePrecision;
    payload.geocodeProvider = draft.geocodeProvider;
    payload.externalPlaceId = draft.externalPlaceId;
  }

  return payload;
}

export type ListingDraft = {
  draft: Draft;
  errors: FieldErrors;
  dirtyCount: number;
  isDirty: boolean;
  /** Publish readiness computed from the draft, not the last save. */
  gaps: ReadinessGap[];
  set: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
  /** Moves the pin and the provenance that goes with it in one update. */
  setPin: (pin: {
    lat: number;
    lng: number;
    precision: GeocodePrecision;
    provider?: string | null;
    placeId?: string | null;
  }) => void;
  validateField: (field: FieldName) => void;
  /**
   * Validates everything and returns only the changed fields, or null when
   * something is invalid. Sending just the changes is what the partial PATCH is
   * for, and it keeps a save small on mobile data.
   */
  prepare: () => UpdateListingInput | null;
  /** The first invalid field in form order, for moving focus after a failure. */
  firstInvalid: () => FieldName | null;
  reset: () => void;
  syncTo: (listing: Listing) => void;
};

/** Form order, so focus lands on the first problem a reader would reach. */
const FOCUS_ORDER: readonly FieldName[] = [
  "title",
  "address",
  "city",
  "rent",
  "otherFees",
  "depositMonths",
  "advanceMonths",
  "parkingCost",
  "bedsPerRoom",
  "bedrooms",
  "bathrooms",
  "description",
  "barangay",
  "curfew",
];

export function useListingDraft(listing: Listing): ListingDraft {
  const saved = useMemo(() => toDraft(listing), [listing]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [errors, setErrors] = useState<FieldErrors>({});

  const changed = changedFields(draft, saved);

  const set = useCallback(<K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    // Cleared on edit rather than re-validated per keystroke: telling someone
    // "enter a number" while they are still typing it is noise, and the blur
    // pass will say it if it is still true.
    setErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const setPin = useCallback<ListingDraft["setPin"]>((pin) => {
    setDraft((current) => ({
      ...current,
      lat: pin.lat,
      lng: pin.lng,
      geocodePrecision: pin.precision,
      geocodeProvider: pin.provider ?? null,
      externalPlaceId: pin.placeId ?? null,
    }));
  }, []);

  const validateField = useCallback(
    (field: FieldName) => {
      setErrors((existing) => ({ ...existing, [field]: validate(draft)[field] }));
    },
    [draft],
  );

  const prepare = useCallback(() => {
    const found = validate(draft);

    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return null;
    }

    setErrors({});
    return toPayload(draft, changedFields(draft, saved));
  }, [draft, saved]);

  const firstInvalid = useCallback(
    () => FOCUS_ORDER.find((field) => errors[field]) ?? null,
    [errors],
  );

  const reset = useCallback(() => {
    setDraft(saved);
    setErrors({});
  }, [saved]);

  const syncTo = useCallback((next: Listing) => {
    setDraft(toDraft(next));
    setErrors({});
  }, []);

  /**
   * Readiness follows what is on screen, not what was last saved.
   *
   * The same `findReadinessGaps` the API publishes against, so the chips, the
   * badge and the server cannot disagree — a landlord who has typed a
   * description should not still be told they need one.
   */
  const gaps = useMemo(
    () =>
      findReadinessGaps({
        listingType: listing.listingType,
        description: draft.description.trim() === "" ? null : draft.description,
        lat: draft.lat,
        lng: draft.lng,
        barangay: draft.barangay.trim() === "" ? null : draft.barangay,
        rent: parseNumber(draft.rent) === "invalid" ? null : Number(draft.rent || 0),
        imageCount: listing.images.length,
      }),
    [draft, listing.listingType, listing.images.length],
  );

  return {
    draft,
    errors,
    dirtyCount: changed.length,
    isDirty: changed.length > 0,
    gaps,
    set,
    setPin,
    validateField,
    prepare,
    firstInvalid,
    reset,
    syncTo,
  };
}

import { z } from "zod";
import { geocodePrecisionSchema } from "./listing";
import type { GeocodePrecision } from "./listing";

/**
 * Turning a typed address into coordinates.
 *
 * The provider is called from the API, never the browser: geocoding is billed
 * per request, and a token shipped to the client is a token anyone can spend.
 */

export const geocodeQuerySchema = z.object({
  q: z.string().trim().min(3, "Enter at least a street and a barangay.").max(200),
});

export type GeocodeQuery = z.infer<typeof geocodeQuerySchema>;

export const geocodeResultSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** What actually matched, so a landlord can see a wrong hit rather than trust it. */
  label: z.string(),
  precision: geocodePrecisionSchema,
  provider: z.string(),
  placeId: z.string().nullable(),
});

export type GeocodeResult = z.infer<typeof geocodeResultSchema>;

/**
 * Mapbox's own precision vocabulary, mapped onto ours.
 *
 * `coordinates.accuracy` is only present on address features and is the better
 * signal, so it wins; `feature_type` is the fallback for everything coarser.
 *
 * Unknown values resolve **downward** to `approximate`, never upward. The whole
 * reason `GeocodePrecision` exists is that a barangay centroid scored as a
 * rooftop is a silent error — nothing downstream can tell the difference, and
 * commute times computed from it would be quietly wrong.
 */
const BY_ACCURACY: Record<string, GeocodePrecision> = {
  rooftop: "rooftop",
  parcel: "rooftop",
  point: "rooftop",
  interpolated: "street",
  intersection: "street",
  approximate: "approximate",
};

const BY_FEATURE_TYPE: Record<string, GeocodePrecision> = {
  address: "street",
  secondary_address: "street",
  street: "street",
  // A Philippine barangay surfaces as a neighborhood or locality, which is the
  // level `barangay` was named for.
  neighborhood: "barangay",
  locality: "barangay",
};

export function precisionFrom(input: {
  accuracy?: string | null;
  featureType?: string | null;
}): GeocodePrecision {
  if (input.accuracy) {
    const byAccuracy = BY_ACCURACY[input.accuracy];
    if (byAccuracy) return byAccuracy;
  }

  if (input.featureType) {
    const byType = BY_FEATURE_TYPE[input.featureType];
    if (byType) return byType;
  }

  return "approximate";
}

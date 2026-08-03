import { precisionFrom } from "@homematch/shared";
import type { GeocodeResult } from "@homematch/shared";
import { env } from "../../shared/config/env";
import { InternalError, NotFoundError } from "../../shared/errors/AppError";
import { logger } from "../../shared/logger";

/**
 * Forward geocoding against Mapbox.
 *
 * Server-side because the token is billed per call; shipping it to the browser
 * would let anyone spend the quota. See `MAPBOX_TOKEN` in shared/config/env.
 */

const FORWARD_URL = "https://api.mapbox.com/search/geocode/v6/forward";

/**
 * Quezon City, and the country. Without both, a bare street name resolves to
 * whichever continent Mapbox finds it on first — "Sampaguita St" exists in more
 * than one country, and proximity is what makes the local one win.
 */
const QC_PROXIMITY = "121.0437,14.676";
const COUNTRY = "ph";

/** Only the fields consumed here. Mapbox returns considerably more. */
type MapboxFeature = {
  properties?: {
    mapbox_id?: string;
    feature_type?: string;
    full_address?: string;
    name?: string;
    place_formatted?: string;
    coordinates?: {
      longitude?: number;
      latitude?: number;
      accuracy?: string;
    };
  };
};

function toResult(feature: MapboxFeature): GeocodeResult | null {
  const properties = feature.properties;
  const coordinates = properties?.coordinates;

  if (
    typeof coordinates?.latitude !== "number" ||
    typeof coordinates?.longitude !== "number"
  ) {
    return null;
  }

  const label =
    properties?.full_address ??
    [properties?.name, properties?.place_formatted].filter(Boolean).join(", ");

  return {
    lat: coordinates.latitude,
    lng: coordinates.longitude,
    label: label || "Unnamed place",
    precision: precisionFrom({
      accuracy: coordinates.accuracy,
      featureType: properties?.feature_type,
    }),
    provider: "mapbox",
    placeId: properties?.mapbox_id ?? null,
  };
}

export async function geocode(query: string): Promise<GeocodeResult> {
  if (!env.MAPBOX_TOKEN) {
    throw new InternalError(
      "Address lookup isn't configured. Drag the pin to set the location instead.",
    );
  }

  const url = new URL(FORWARD_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("country", COUNTRY);
  url.searchParams.set("proximity", QC_PROXIMITY);
  url.searchParams.set("limit", "1");
  // The landlord has finished typing before this fires, so partial-token
  // matching only makes the result fuzzier.
  url.searchParams.set("autocomplete", "false");
  url.searchParams.set("access_token", env.MAPBOX_TOKEN);

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (cause) {
    logger.warn({ cause }, "geocoding request failed");
    throw new InternalError("Couldn't reach the address service. Try again.");
  }

  if (!response.ok) {
    // The URL carries the token, so it is never logged.
    logger.warn({ status: response.status }, "geocoding provider returned an error");
    throw new InternalError("The address service didn't answer. Try again.");
  }

  const body = (await response.json()) as { features?: MapboxFeature[] };
  const first = body.features?.[0];
  const result = first ? toResult(first) : null;

  if (!result) {
    throw new NotFoundError(
      "We couldn't find that address. Check the spelling, or drag the pin instead.",
    );
  }

  return result;
}

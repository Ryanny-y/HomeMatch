import { describe, expect, it } from "vitest";
import { precisionFrom } from "@homematch/shared";

/**
 * The mapping from Mapbox's precision vocabulary onto ours.
 *
 * Pure and worth pinning, because getting it wrong is *silent*: a barangay
 * centroid recorded as a rooftop looks identical downstream, and every commute
 * time computed from it would be quietly wrong. The rule these tests enforce is
 * that unknown values resolve downward, never upward.
 *
 * Values taken from the Mapbox Geocoding v6 documentation:
 *   coordinates.accuracy — rooftop | parcel | point | interpolated |
 *                          approximate | intersection
 *   feature_type         — country | region | postcode | district | place |
 *                          locality | neighborhood | street | address |
 *                          secondary_address
 */
describe("precisionFrom", () => {
  it("treats a rooftop or parcel hit as a rooftop", () => {
    expect(precisionFrom({ accuracy: "rooftop", featureType: "address" })).toBe("rooftop");
    expect(precisionFrom({ accuracy: "parcel", featureType: "address" })).toBe("rooftop");
  });

  it("demotes an interpolated address to street", () => {
    // Mapbox guessed a house number along a segment; it is not a building.
    expect(precisionFrom({ accuracy: "interpolated", featureType: "address" })).toBe(
      "street",
    );
    expect(precisionFrom({ accuracy: "intersection", featureType: "street" })).toBe(
      "street",
    );
  });

  it("maps a neighborhood or locality to barangay", () => {
    expect(precisionFrom({ featureType: "neighborhood" })).toBe("barangay");
    expect(precisionFrom({ featureType: "locality" })).toBe("barangay");
  });

  it("never scores a coarse feature as precise", () => {
    for (const featureType of ["place", "district", "region", "postcode", "country"]) {
      expect(precisionFrom({ featureType })).toBe("approximate");
    }
  });

  it("falls back to approximate rather than guessing upward", () => {
    expect(precisionFrom({})).toBe("approximate");
    expect(precisionFrom({ accuracy: null, featureType: null })).toBe("approximate");
    // A value Mapbox adds later must not be silently trusted as a rooftop.
    expect(precisionFrom({ accuracy: "something_new" })).toBe("approximate");
    expect(precisionFrom({ featureType: "something_new" })).toBe("approximate");
  });

  it("prefers accuracy over feature type when both are present", () => {
    // An `address` feature whose coordinate is only approximate is not a street
    // match — accuracy is the more specific signal and wins.
    expect(precisionFrom({ accuracy: "approximate", featureType: "address" })).toBe(
      "approximate",
    );
  });
});

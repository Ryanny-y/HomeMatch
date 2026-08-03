import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_RENTER_PREFERENCE,
  canScoreListings,
  updateRenterPreferenceSchema,
} from "@homematch/shared";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    renterPreference: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

import { prisma } from "../../../lib/prisma";
import { Prisma } from "../../../generated/prisma/client";
import * as service from "../profile.service";
import type { RenterPreferenceRow } from "../profile.repository";

/** Money comes back from Prisma as Decimal, never as a number or a string. */
const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

const ACTOR = { userId: "user-1", role: "renter" as const, emailVerified: true };

function row(overrides: Partial<RenterPreferenceRow> = {}): RenterPreferenceRow {
  return {
    id: "pref-1",
    userId: ACTOR.userId,
    budget: null,
    householdSize: null,
    wants: [],
    otherNeeds: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-02T00:00:00.000Z"),
    ...overrides,
  };
}

const findUnique = vi.mocked(prisma.renterPreference.findUnique);
const upsert = vi.mocked(prisma.renterPreference.upsert);

beforeEach(() => {
  findUnique.mockReset();
  upsert.mockReset();
});

describe("getMine", () => {
  it("returns an empty profile rather than failing when nothing is saved", async () => {
    findUnique.mockResolvedValue(null);

    // A first visit must render, not 404 — the surface is designed for
    // "you have set nothing".
    await expect(service.getMine(ACTOR)).resolves.toEqual(EMPTY_RENTER_PREFERENCE);
  });

  it("converts the Decimal budget to a plain number", async () => {
    findUnique.mockResolvedValue(row({ budget: decimal("18000.00") }));

    expect((await service.getMine(ACTOR)).budget).toBe(18000);
  });

  it("passes wants through as stored", async () => {
    findUnique.mockResolvedValue(row({ wants: ["pets", "near_transit"] }));

    expect((await service.getMine(ACTOR)).wants).toEqual(["pets", "near_transit"]);
  });
});

describe("updateMine", () => {
  it("writes only the fields the caller sent", async () => {
    upsert.mockResolvedValue(row({ budget: decimal("20000.00") }));

    await service.updateMine({ budget: 20000 }, ACTOR);

    // An unsent field must not be written: `undefined` and `null` reach Prisma
    // the same way, so passing every key through would wipe untouched columns.
    expect(upsert.mock.calls[0]?.[0].update).toEqual({ budget: 20000 });
    expect(upsert.mock.calls[0]?.[0].update).not.toHaveProperty("householdSize");
  });

  it("clears a field when the caller sends null", async () => {
    upsert.mockResolvedValue(row());

    await service.updateMine({ budget: null }, ACTOR);

    expect(upsert.mock.calls[0]?.[0].update).toEqual({ budget: null });
  });

  it("stores emptied text as null rather than an empty string", async () => {
    upsert.mockResolvedValue(row());

    await service.updateMine({ otherNeeds: "" }, ACTOR);

    expect(upsert.mock.calls[0]?.[0].update).toEqual({ otherNeeds: null });
  });

  it("writes an emptied wants list rather than treating it as absent", async () => {
    upsert.mockResolvedValue(row());

    // Unchecking every box is a real edit. Skipping it because the array is
    // empty would leave the old selection in place.
    await service.updateMine({ wants: [] }, ACTOR);

    expect(upsert.mock.calls[0]?.[0].update).toEqual({ wants: [] });
  });

  it("scopes the write to the acting renter", async () => {
    upsert.mockResolvedValue(row());

    await service.updateMine({ householdSize: 2 }, ACTOR);

    expect(upsert.mock.calls[0]?.[0].where).toEqual({ userId: ACTOR.userId });
    expect(upsert.mock.calls[0]?.[0].create).toMatchObject({ userId: ACTOR.userId });
  });
});

describe("updateRenterPreferenceSchema", () => {
  it("rejects a budget above the sanity bound", () => {
    expect(updateRenterPreferenceSchema.safeParse({ budget: 2_000_000 }).success).toBe(false);
    expect(updateRenterPreferenceSchema.safeParse({ budget: 18_000 }).success).toBe(true);
  });

  it("rejects a budget of zero or below", () => {
    expect(updateRenterPreferenceSchema.safeParse({ budget: 0 }).success).toBe(false);
  });

  it("rejects a household size outside 1–12", () => {
    expect(updateRenterPreferenceSchema.safeParse({ householdSize: 0 }).success).toBe(false);
    expect(updateRenterPreferenceSchema.safeParse({ householdSize: 13 }).success).toBe(false);
    expect(updateRenterPreferenceSchema.safeParse({ householdSize: 2 }).success).toBe(true);
  });

  it("rejects a want it does not define", () => {
    // Anything outside the list belongs in `otherNeeds`, where prose is
    // expected — not smuggled into a column the scorer filters on.
    expect(updateRenterPreferenceSchema.safeParse({ wants: ["rooftop_pool"] }).success).toBe(false);
  });

  it("accepts an empty wants list", () => {
    expect(updateRenterPreferenceSchema.safeParse({ wants: [] }).success).toBe(true);
  });

  it("rejects other needs over 500 characters", () => {
    expect(updateRenterPreferenceSchema.safeParse({ otherNeeds: "x".repeat(501) }).success).toBe(
      false,
    );
  });
});

describe("canScoreListings", () => {
  it("is false with nothing set", () => {
    expect(canScoreListings(EMPTY_RENTER_PREFERENCE)).toBe(false);
  });

  it("is false on a budget alone", () => {
    // A budget can only say what is too expensive. Ranking needs something to
    // rank on.
    expect(canScoreListings({ ...EMPTY_RENTER_PREFERENCE, budget: 18000 })).toBe(false);
  });

  it("is false on wants alone", () => {
    expect(canScoreListings({ ...EMPTY_RENTER_PREFERENCE, wants: ["pets"] })).toBe(false);
  });

  it("is true once a budget is paired with wants", () => {
    expect(
      canScoreListings({ ...EMPTY_RENTER_PREFERENCE, budget: 18000, wants: ["pets"] }),
    ).toBe(true);
  });

  it("accepts written needs in place of checked wants", () => {
    expect(
      canScoreListings({
        ...EMPTY_RENTER_PREFERENCE,
        budget: 18000,
        otherNeeds: "Somewhere quiet, near a train.",
      }),
    ).toBe(true);
  });
});

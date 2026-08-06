import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import {
  computeTrueMonthlyCost,
  COST_CATEGORIES,
  moveInTotal,
  totalMonthlyCost,
} from "@homematch/shared";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";
import { ACCESS_COOKIE } from "../../auth/auth.cookies";
import { closeDatabase, resetDatabase } from "../../../../tests/helpers/db";
import {
  TEST_PASSWORD,
  cookieHeader,
  createUser,
  readCookie,
} from "../../../../tests/helpers/factories";

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

async function signIn(email: string, role: "renter" | "landlord" | "admin") {
  await createUser({ email, role, emailVerified: true });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: TEST_PASSWORD });
  return readCookie(res.headers["set-cookie"] as unknown as string[], ACCESS_COOKIE);
}

const DRAFT = {
  title: "Studio near Katipunan",
  propertyType: "condo" as const,
  listingType: "whole_unit" as const,
  address: "12 Esteban Abada St",
  rent: 18000,
};

async function createDraft(token: string | undefined) {
  return request(app)
    .post("/api/listings")
    .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }))
    .send(DRAFT);
}

describe("role gate", () => {
  it("403s a renter", async () => {
    const token = await signIn("renter@example.com", "renter");

    const res = await request(app)
      .get("/api/listings/mine")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("401s an anonymous caller", async () => {
    const res = await request(app).get("/api/listings/mine");
    expect(res.status).toBe(401);
  });
});

describe("ownership", () => {
  it("hides another landlord's listing behind a 404, not a 403", async () => {
    const owner = await signIn("owner@example.com", "landlord");
    const created = await createDraft(owner);
    const id = created.body.data.listing.id as string;

    const intruder = await signIn("intruder@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: intruder });

    // 404 rather than 403 on purpose: confirming the id exists but belongs to
    // someone else leaks the shape of the catalog.
    expect((await request(app).get(`/api/listings/${id}`).set("Cookie", cookie)).status).toBe(404);
    expect(
      (await request(app).patch(`/api/listings/${id}`).set("Cookie", cookie).send({ rent: 1 }))
        .status,
    ).toBe(404);
    expect((await request(app).delete(`/api/listings/${id}`).set("Cookie", cookie)).status).toBe(404);
  });

  it("keeps another landlord's listing out of my list", async () => {
    const owner = await signIn("owner@example.com", "landlord");
    await createDraft(owner);

    const other = await signIn("other@example.com", "landlord");
    const res = await request(app)
      .get("/api/listings/mine")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: other }));

    expect(res.body.data.listings).toHaveLength(0);
  });

  it("lets an admin reach a listing they do not own", async () => {
    const owner = await signIn("owner@example.com", "landlord");
    const created = await createDraft(owner);
    const id = created.body.data.listing.id as string;

    const admin = await signIn("boss@example.com", "admin");
    const res = await request(app)
      .get(`/api/listings/${id}`)
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: admin }));

    expect(res.status).toBe(200);
  });
});

describe("create and publish", () => {
  it("creates a draft and names what is missing", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const res = await createDraft(token);

    expect(res.status).toBe(201);
    expect(res.body.data.listing.status).toBe("draft");

    const fields = (res.body.data.listing.gaps as { field: string }[]).map((g) => g.field);
    expect(fields).toContain("images");
    expect(fields).toContain("location");
  });

  it("refuses to publish while gaps remain, and says which", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const created = await createDraft(token);
    const id = created.body.data.listing.id as string;

    const res = await request(app)
      .post(`/api/listings/${id}/publish`)
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }));

    expect(res.status).toBe(422);
    expect(res.body.error.details.gaps.length).toBeGreaterThan(0);
  });

  it("publishes once every gap is closed", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const created = await createDraft(token);
    const id = created.body.data.listing.id as string;

    await request(app).patch(`/api/listings/${id}`).set("Cookie", cookie).send({
      description: "Quiet studio one jeepney ride from Ateneo.",
      barangay: "Loyola Heights",
      lat: 14.6399,
      lng: 121.0776,
    });

    await prisma.listingImage.create({
      data: { listingId: id, storageKey: `listings/${id}/a.jpg`, isPrimary: true, order: 0 },
    });

    const res = await request(app).post(`/api/listings/${id}/publish`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("published");
    expect(res.body.data.listing.gaps).toHaveLength(0);
  });

  it("archives without losing the row", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    const res = await request(app).post(`/api/listings/${id}/archive`).set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.listing.status).toBe("archived");
    expect(await prisma.listing.count()).toBe(1);
  });
});

describe("money", () => {
  it("round-trips decimals without float drift", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    await request(app)
      .patch(`/api/listings/${id}`)
      .set("Cookie", cookie)
      .send({ rent: 18999.99, otherFees: 1234.56 });

    const res = await request(app).get(`/api/listings/${id}`).set("Cookie", cookie);

    expect(res.body.data.listing.rent).toBe(18999.99);
    expect(res.body.data.listing.otherFees).toBe(1234.56);
  });
});

/**
 * The stored column exists so the catalog can *filter* on the figure the cards
 * *display*. These read it straight out of Postgres rather than through the
 * API, because the API answers with the rendered figure either way — which is
 * exactly the disagreement that would go unnoticed.
 */
describe("stored true monthly cost", () => {
  async function storedCost(id: string): Promise<number> {
    const row = await prisma.listing.findUniqueOrThrow({
      where: { id },
      select: { trueMonthlyCost: true },
    });

    return Number(row.trueMonthlyCost);
  }

  it("is the rent on a fresh draft", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const id = (await createDraft(token)).body.data.listing.id as string;

    expect(await storedCost(id)).toBe(18000);
  });

  it("matches what the card computes once fees and parking are added", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    const money = { rent: 24000, otherFees: 1200, parkingAvailable: true, parkingCost: 1500 };

    await request(app).patch(`/api/listings/${id}`).set("Cookie", cookie).send(money);

    // Asserted against the shared function rather than the literal 26700, so
    // this fails if the two ever start disagreeing — which is the whole point
    // of the column.
    expect(await storedCost(id)).toBe(totalMonthlyCost(computeTrueMonthlyCost(money)));
  });

  it("ignores a parking charge while parking is switched off", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    await request(app)
      .patch(`/api/listings/${id}`)
      .set("Cookie", cookie)
      .send({ parkingAvailable: false, parkingCost: 1500 });

    // A stale figure left on a unit that does not offer parking must not be
    // charged for, and the backfill in the migration makes the same exception.
    expect(await storedCost(id)).toBe(18000);
  });

  it("recomputes when a cost field is cleared", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    await request(app).patch(`/api/listings/${id}`).set("Cookie", cookie).send({ otherFees: 2000 });
    expect(await storedCost(id)).toBe(20000);

    // `null` clears; it must not be read as "unchanged" the way `undefined` is.
    await request(app).patch(`/api/listings/${id}`).set("Cookie", cookie).send({ otherFees: null });
    expect(await storedCost(id)).toBe(18000);
  });

  it("survives a patch that touches nothing about money", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    await request(app).patch(`/api/listings/${id}`).set("Cookie", cookie).send({ otherFees: 2000 });
    await request(app)
      .patch(`/api/listings/${id}`)
      .set("Cookie", cookie)
      .send({ title: "Renamed, same money" });

    // An unrelated edit recomputes from the stored row, so it must arrive at
    // the same figure rather than resetting to the bare rent.
    expect(await storedCost(id)).toBe(20000);
  });
});

describe("amenities scored against renter wants", () => {
  it("defaults to false rather than null, so an unanswered amenity is a real answer", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const listing = (await createDraft(token)).body.data.listing;

    expect(listing.furnished).toBe(false);
    expect(listing.aircon).toBe(false);
    expect(listing.nearTransit).toBe(false);
  });

  it("round-trips the three fields a renter's wants are scored against", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    await request(app)
      .patch(`/api/listings/${id}`)
      .set("Cookie", cookie)
      .send({ furnished: true, aircon: true, nearTransit: true });

    const res = await request(app).get(`/api/listings/${id}`).set("Cookie", cookie);

    // Every RenterWant maps 1:1 to a listing field; these three are the ones
    // added for that. A want with nothing to compare against cannot be scored.
    expect(res.body.data.listing.furnished).toBe(true);
    expect(res.body.data.listing.aircon).toBe(true);
    expect(res.body.data.listing.nearTransit).toBe(true);
  });

  it("does not block publishing — an amenity is never a readiness gap", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    const res = await request(app).get(`/api/listings/${id}`).set("Cookie", cookie);
    const fields = (res.body.data.listing.gaps as { field: string }[]).map((g) => g.field);

    expect(fields).not.toContain("furnished");
    expect(fields).not.toContain("aircon");
    expect(fields).not.toContain("nearTransit");
  });
});

describe("true monthly cost", () => {
  it("emits only categories the colour contract allows", () => {
    const lines = computeTrueMonthlyCost({
      rent: 18000,
      otherFees: 4300,
      parkingAvailable: true,
      parkingCost: 2500,
    });

    // A fourth line would need a fourth hue and would break the contract
    // documented in globals.css.
    for (const line of lines) {
      expect(COST_CATEGORIES).toContain(line.category);
    }
    expect(new Set(lines.map((l) => l.category)).size).toBe(lines.length);
  });

  it("carries other fees as their own line", () => {
    const lines = computeTrueMonthlyCost({
      rent: 10000,
      otherFees: 800,
      parkingAvailable: false,
      parkingCost: null,
    });

    expect(lines.find((l) => l.category === "other")?.amount).toBe(800);
  });

  it("omits other costs entirely when there are none", () => {
    // Absent, not a zero line: a breakdown should show what this unit charges
    // rather than a fixed template with blanks in it.
    const lines = computeTrueMonthlyCost({
      rent: 10000,
      otherFees: null,
      parkingAvailable: false,
      parkingCost: null,
    });

    expect(lines.map((l) => l.category)).toEqual(["rent"]);
  });

  it("keeps deposit and advance out of the monthly figure", () => {
    // The regression this whole shape exists to prevent. Amortising move-in
    // over twelve months made a ₱5,000 unit report ₱6,450 "per month" — a
    // figure the landlord never typed. `moveInTotal` reports it separately.
    const monthly = { rent: 5000, otherFees: 200, parkingAvailable: false, parkingCost: null };

    expect(totalMonthlyCost(computeTrueMonthlyCost(monthly))).toBe(5200);
    expect(moveInTotal({ rent: 5000, depositMonths: 2, advanceMonths: 1 })).toBe(15000);
  });

  it("costs a bedspace correctly with no bedrooms", () => {
    // The whole point of listingType: rent is per bed here, and nothing in the
    // maths should depend on a room count.
    const lines = computeTrueMonthlyCost({
      rent: 4500,
      otherFees: null,
      parkingAvailable: false,
      parkingCost: null,
    });

    expect(lines.map((l) => l.category)).toEqual(["rent"]);
    expect(totalMonthlyCost(lines)).toBe(4500);
  });
});

describe("images", () => {
  it("refuses a storage key belonging to another listing", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const mine = (await createDraft(token)).body.data.listing.id as string;

    const res = await request(app)
      .post(`/api/listings/${mine}/images`)
      .set("Cookie", cookie)
      .send({ storageKey: "listings/00000000-0000-0000-0000-000000000000/stolen.jpg" });

    expect(res.status).toBe(403);
  });

  it("makes the first photo primary and promotes the next when it is deleted", async () => {
    const token = await signIn("owner@example.com", "landlord");
    const cookie = cookieHeader({ [ACCESS_COOKIE]: token });
    const id = (await createDraft(token)).body.data.listing.id as string;

    await request(app)
      .post(`/api/listings/${id}/images`)
      .set("Cookie", cookie)
      .send({ storageKey: `listings/${id}/one.jpg` });
    const second = await request(app)
      .post(`/api/listings/${id}/images`)
      .set("Cookie", cookie)
      .send({ storageKey: `listings/${id}/two.jpg` });

    const images = second.body.data.listing.images as { id: string; isPrimary: boolean }[];
    const primary = images.find((i) => i.isPrimary);
    expect(primary).toBeTruthy();

    const after = await request(app)
      .delete(`/api/listings/${id}/images/${primary?.id}`)
      .set("Cookie", cookie);

    // A listing with photos and no primary renders an empty thumbnail.
    const remaining = after.body.data.listing.images as { isPrimary: boolean }[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.isPrimary).toBe(true);
  });
});

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { computeTrueMonthlyCost, COST_CATEGORIES } from "@homematch/shared";
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
      estUtilities: 1800,
      estInternet: 1500,
      availableFrom: "2026-09-01",
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
      .send({ rent: 18999.99, assocDues: 1234.56 });

    const res = await request(app).get(`/api/listings/${id}`).set("Cookie", cookie);

    expect(res.body.data.listing.rent).toBe(18999.99);
    expect(res.body.data.listing.assocDues).toBe(1234.56);
  });
});

describe("true monthly cost", () => {
  it("emits only categories the colour contract allows", () => {
    const lines = computeTrueMonthlyCost({
      rent: 18000,
      depositMonths: 2,
      advanceMonths: 1,
      utilitiesIncluded: false,
      estUtilities: 1800,
      estInternet: 1500,
      assocDues: 800,
      otherFees: 200,
      parkingAvailable: true,
      parkingCost: 2500,
    });

    // A seventh line would need a seventh hue and would break the contract
    // documented in globals.css.
    for (const line of lines) {
      expect(COST_CATEGORIES).toContain(line.category);
    }
    expect(new Set(lines.map((l) => l.category)).size).toBe(lines.length);
  });

  it("folds other fees into dues rather than inventing a line", () => {
    const lines = computeTrueMonthlyCost({
      rent: 10000,
      depositMonths: 0,
      advanceMonths: 0,
      utilitiesIncluded: true,
      estUtilities: null,
      estInternet: null,
      assocDues: 500,
      otherFees: 300,
      parkingAvailable: false,
      parkingCost: null,
    });

    expect(lines.find((l) => l.category === "dues")?.amount).toBe(800);
  });

  it("costs a bedspace correctly with no bedrooms", () => {
    // The whole point of listingType: rent is per bed here, and nothing in the
    // maths should depend on a room count.
    const lines = computeTrueMonthlyCost({
      rent: 4500,
      depositMonths: 1,
      advanceMonths: 1,
      utilitiesIncluded: true,
      estUtilities: null,
      estInternet: null,
      assocDues: null,
      otherFees: null,
      parkingAvailable: false,
      parkingCost: null,
    });

    expect(lines.map((l) => l.category)).toEqual(["rent", "movein"]);
    expect(lines.find((l) => l.category === "movein")?.amount).toBe(750);
  });

  it("treats included utilities as zero, not unknown", () => {
    const lines = computeTrueMonthlyCost({
      rent: 10000,
      depositMonths: 0,
      advanceMonths: 0,
      utilitiesIncluded: true,
      estUtilities: 3000,
      estInternet: null,
      assocDues: null,
      otherFees: null,
      parkingAvailable: false,
      parkingCost: null,
    });

    expect(lines.find((l) => l.category === "utilities")).toBeUndefined();
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

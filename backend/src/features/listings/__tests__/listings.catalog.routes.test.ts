import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { ListingStatus, Role } from "@homematch/shared";
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

/**
 * The catalog. Three things are worth testing and little else:
 * that it is unreachable without a session, that unpublished rows are
 * unreachable by any route, and that the response carries none of the fields
 * the owner-facing DTO does.
 */

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

let signedIn: string | undefined;

/**
 * A session for the reader.
 *
 * Most cases here are about *what* comes back rather than who asked, so the
 * default caller is a renter — the role with no relationship to any listing,
 * which is the one that would notice a leaked `ownerId`.
 */
async function signIn(role: Role = "renter"): Promise<string | undefined> {
  const email = `catalog.${role}.${Date.now()}.${Math.random()}@example.test`;
  await createUser({ email, role, emailVerified: true });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: TEST_PASSWORD });

  return readCookie(res.headers["set-cookie"] as unknown as string[], ACCESS_COOKIE);
}

/** Every catalog request in this file goes through here, so none can forget the cookie. */
function get(path: string) {
  return request(app)
    .get(path)
    .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: signedIn }));
}

beforeEach(async () => {
  signedIn = await signIn();
});

let slugCounter = 0;

async function createListing(overrides: {
  status: ListingStatus;
  slug?: string;
  title?: string;
  rent?: number;
  publishedAt?: Date;
}) {
  const owner = await createUser({ role: "landlord", emailVerified: true });
  slugCounter += 1;

  return prisma.listing.create({
    data: {
      ownerId: owner.id,
      slug: overrides.slug ?? `unit-${slugCounter}`,
      title: overrides.title ?? "A unit in Quezon City",
      propertyType: "apartment",
      listingType: "whole_unit",
      address: "12 Esteban Abada St",
      rent: overrides.rent ?? 18000,
      trueMonthlyCost: overrides.rent ?? 18000,
      status: overrides.status,
      publishedAt: overrides.status === "published" ? (overrides.publishedAt ?? new Date()) : null,
    },
    select: { id: true, slug: true },
  });
}

/**
 * The gate is authentication, not role. Anyone with an account sees the same
 * catalog; a `requireRole` here would invent a rule the product does not have.
 */
describe("the login wall", () => {
  it("401s an anonymous caller on the list", async () => {
    await createListing({ status: "published" });

    const res = await request(app).get("/api/catalog/listings");

    expect(res.status).toBe(401);
  });

  it("401s an anonymous caller on a listing that exists", async () => {
    await createListing({ status: "published", slug: "kamias-corner-studio" });

    const res = await request(app).get("/api/catalog/listings/kamias-corner-studio");

    expect(res.status).toBe(401);
  });

  it.each(["renter", "landlord", "admin"] as const)("serves a %s", async (role) => {
    await createListing({ status: "published" });
    const token = await signIn(role);

    const res = await request(app)
      .get("/api/catalog/listings")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }));

    expect(res.status).toBe(200);
    expect(res.body.data.listings).toHaveLength(1);
  });
});

describe("GET /api/catalog/listings", () => {
  it("returns the published catalog", async () => {
    await createListing({ status: "published" });

    const res = await get("/api/catalog/listings");

    expect(res.status).toBe(200);
    expect(res.body.data.listings).toHaveLength(1);
  });

  it("returns only published listings", async () => {
    await createListing({ status: "published", slug: "visible" });
    await createListing({ status: "draft", slug: "still-being-written" });
    await createListing({ status: "archived", slug: "taken-down" });

    const res = await get("/api/catalog/listings");

    expect(res.body.data.listings).toHaveLength(1);
    expect(res.body.data.listings[0].slug).toBe("visible");
  });

  it("carries pagination in the shared meta shape", async () => {
    await createListing({ status: "published" });

    const res = await get("/api/catalog/listings");

    expect(res.body.meta).toEqual({ page: 1, pageSize: 12, total: 1 });
  });

  it("counts every published row, not just the page", async () => {
    await createListing({ status: "published", slug: "one" });
    await createListing({ status: "published", slug: "two" });
    await createListing({ status: "published", slug: "three" });

    const res = await get("/api/catalog/listings?pageSize=2");

    expect(res.body.data.listings).toHaveLength(2);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 2, total: 3 });
  });

  it("pages without repeating or dropping a listing", async () => {
    const shared = new Date("2026-01-01T00:00:00Z");
    await createListing({ status: "published", slug: "a", publishedAt: shared });
    await createListing({ status: "published", slug: "b", publishedAt: shared });
    await createListing({ status: "published", slug: "c", publishedAt: shared });

    const first = await get("/api/catalog/listings?pageSize=2&page=1");
    const second = await get("/api/catalog/listings?pageSize=2&page=2");

    const slugs = [...first.body.data.listings, ...second.body.data.listings].map(
      (listing: { slug: string }) => listing.slug,
    );

    expect([...slugs].sort()).toEqual(["a", "b", "c"]);
  });

  it("rejects a page size that would return the whole table", async () => {
    const res = await get("/api/catalog/listings?pageSize=5000");

    expect(res.status).toBe(422);
  });
});

describe("the catalog DTO", () => {
  it("withholds the fields the owner-facing DTO carries", async () => {
    await createListing({ status: "published" });

    const res = await get("/api/catalog/listings");
    const listing = res.body.data.listings[0];

    expect(listing).not.toHaveProperty("ownerId");
    expect(listing).not.toHaveProperty("status");
    expect(listing).not.toHaveProperty("gaps");
  });

  it("carries the publish date, so the card can say when it went live", async () => {
    await createListing({
      status: "published",
      publishedAt: new Date("2026-03-04T05:06:07Z"),
    });

    const res = await get("/api/catalog/listings");

    expect(res.body.data.listings[0].publishedAt).toBe("2026-03-04T05:06:07.000Z");
  });
});

describe("GET /api/catalog/listings/:slug", () => {
  it("serves a published listing by slug", async () => {
    await createListing({ status: "published", slug: "kamias-corner-studio" });

    const res = await get("/api/catalog/listings/kamias-corner-studio");

    expect(res.status).toBe(200);
    expect(res.body.data.listing.slug).toBe("kamias-corner-studio");
    expect(res.body.data.listing).not.toHaveProperty("ownerId");
  });

  it("404s a slug that was never minted", async () => {
    const res = await get("/api/catalog/listings/no-such-listing");

    expect(res.status).toBe(404);
  });

  /**
   * The pair that matters: a draft must be indistinguishable from a listing that
   * does not exist. A 403 here would let anyone confirm a slug is real and
   * enumerate what landlords are still working on.
   */
  it("404s a draft rather than admitting it exists", async () => {
    await createListing({ status: "draft", slug: "still-being-written" });

    const res = await get("/api/catalog/listings/still-being-written");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("404s an archived listing", async () => {
    await createListing({ status: "archived", slug: "taken-down" });

    const res = await get("/api/catalog/listings/taken-down");

    expect(res.status).toBe(404);
  });

  it("422s a slug that could never have been minted", async () => {
    const res = await get("/api/catalog/listings/Not%20A%20Slug");

    expect(res.status).toBe(422);
  });
});

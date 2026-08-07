import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
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
  const user = await createUser({ email, role, emailVerified: true });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: TEST_PASSWORD });

  return {
    id: user.id,
    token: readCookie(res.headers["set-cookie"] as unknown as string[], ACCESS_COOKIE),
  };
}

function as(token: string | undefined) {
  return cookieHeader({ [ACCESS_COOKIE]: token });
}

let slugCounter = 0;

async function createListing(
  ownerId: string,
  overrides: Partial<{
    title: string;
    status: "draft" | "published" | "archived";
    rent: number;
    barangay: string;
    description: string;
    lat: number;
    lng: number;
  }> = {},
) {
  slugCounter += 1;

  return prisma.listing.create({
    data: {
      slug: `unit-${slugCounter}`,
      ownerId,
      title: overrides.title ?? "Studio near Katipunan",
      status: overrides.status ?? "draft",
      propertyType: "condo",
      listingType: "whole_unit",
      address: "12 Esteban Abada St",
      rent: overrides.rent ?? 18000,
      // Neither fee column is set here, so true cost is the rent. Written from
      // the same expression rather than a literal, so a changed default rent
      // cannot leave the two disagreeing.
      trueMonthlyCost: overrides.rent ?? 18000,
      barangay: overrides.barangay ?? null,
      description: overrides.description ?? null,
      lat: overrides.lat ?? null,
      lng: overrides.lng ?? null,
    },
    select: { id: true },
  });
}

describe("role gate", () => {
  it("401s an anonymous caller", async () => {
    const res = await request(app).get("/api/admin/overview");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("403s a renter", async () => {
    const { token } = await signIn("renter@example.com", "renter");

    const res = await request(app).get("/api/admin/overview").set("Cookie", as(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("403s a landlord — being able to manage listings is not being an admin", async () => {
    const { token } = await signIn("landlord@example.com", "landlord");

    const res = await request(app).get("/api/admin/users").set("Cookie", as(token));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("lets an admin through", async () => {
    const { token } = await signIn("boss@example.com", "admin");

    const res = await request(app).get("/api/admin/overview").set("Cookie", as(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /users", () => {
  it("returns the fixed pagination meta shape", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    await createUser({ role: "renter" });
    await createUser({ role: "landlord" });

    const res = await request(app)
      .get("/api/admin/users?page=1&pageSize=2")
      .set("Cookie", as(token));

    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 2, total: 3 });
    expect(res.body.data.users).toHaveLength(2);
  });

  it("filters by role", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    await createUser({ role: "landlord", email: "keeper@example.com" });
    await createUser({ role: "renter" });

    const res = await request(app)
      .get("/api/admin/users?role=landlord")
      .set("Cookie", as(token));

    expect(res.body.meta.total).toBe(1);
    expect(res.body.data.users[0].email).toBe("keeper@example.com");
  });

  it("searches email and name case-insensitively", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    await createUser({ email: "mara.reyes@example.com", fullName: "Mara Reyes" });
    await createUser({ email: "someone.else@example.com", fullName: "Other Person" });

    const res = await request(app)
      .get("/api/admin/users?q=MARA")
      .set("Cookie", as(token));

    expect(res.body.meta.total).toBe(1);
    expect(res.body.data.users[0].fullName).toBe("Mara Reyes");
  });

  it("carries a listing count so the delete warning can be honest", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const owner = await createUser({ role: "landlord", email: "owner@example.com" });
    await createListing(owner.id);
    await createListing(owner.id);

    const res = await request(app)
      .get("/api/admin/users?q=owner@example.com")
      .set("Cookie", as(token));

    expect(res.body.data.users[0].listingCount).toBe(2);
  });

  it("rejects a page size above the cap rather than honouring it", async () => {
    const { token } = await signIn("boss@example.com", "admin");

    const res = await request(app)
      .get("/api/admin/users?pageSize=5000")
      .set("Cookie", as(token));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /users/:id/role", () => {
  it("promotes a renter to landlord", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const target = await createUser({ role: "renter" });

    const res = await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set("Cookie", as(token))
      .send({ role: "landlord" });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe("landlord");
  });

  it("revokes the target's sessions so the old role claim cannot outlive the change", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const target = await signIn("mover@example.com", "renter");

    await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set("Cookie", as(token))
      .send({ role: "landlord" });

    const live = await prisma.refreshToken.count({
      where: { userId: target.id, revokedAt: null },
    });

    expect(live).toBe(0);
  });

  it("refuses to mint an admin through the API", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const target = await createUser({ role: "renter" });

    const res = await request(app)
      .patch(`/api/admin/users/${target.id}/role`)
      .set("Cookie", as(token))
      .send({ role: "admin" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuses to change another admin", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const peer = await createUser({ role: "admin", email: "peer@example.com" });

    const res = await request(app)
      .patch(`/api/admin/users/${peer.id}/role`)
      .set("Cookie", as(token))
      .send({ role: "renter" });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("refuses to change your own role", async () => {
    const { id, token } = await signIn("boss@example.com", "admin");

    const res = await request(app)
      .patch(`/api/admin/users/${id}/role`)
      .set("Cookie", as(token))
      .send({ role: "renter" });

    expect(res.status).toBe(403);
  });

  it("404s an id that does not exist", async () => {
    const { token } = await signIn("boss@example.com", "admin");

    const res = await request(app)
      .patch("/api/admin/users/8f1a1f1e-0000-4000-8000-000000000000/role")
      .set("Cookie", as(token))
      .send({ role: "renter" });

    expect(res.status).toBe(404);
  });
});

describe("user actions", () => {
  it("reports whether a verification email was actually needed", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const unverified = await createUser({ emailVerified: false });
    const verified = await createUser({ emailVerified: true });

    const first = await request(app)
      .post(`/api/admin/users/${unverified.id}/resend-verification`)
      .set("Cookie", as(token));

    const second = await request(app)
      .post(`/api/admin/users/${verified.id}/resend-verification`)
      .set("Cookie", as(token));

    expect(first.body.data.sent).toBe(true);
    expect(second.body.data.sent).toBe(false);
  });

  it("signs a user out everywhere", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const target = await signIn("noisy@example.com", "renter");

    const res = await request(app)
      .post(`/api/admin/users/${target.id}/sign-out`)
      .set("Cookie", as(token));

    expect(res.status).toBe(200);
    expect(res.body.data.sessionsRevoked).toBeGreaterThan(0);
  });

  it("deletes a user and cascades their listings", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const owner = await createUser({ role: "landlord" });
    await createListing(owner.id);

    const res = await request(app)
      .delete(`/api/admin/users/${owner.id}`)
      .set("Cookie", as(token));

    expect(res.status).toBe(200);
    expect(await prisma.user.count({ where: { id: owner.id } })).toBe(0);
    expect(await prisma.listing.count({ where: { ownerId: owner.id } })).toBe(0);
  });

  it("refuses to delete your own account", async () => {
    const { id, token } = await signIn("boss@example.com", "admin");

    const res = await request(app)
      .delete(`/api/admin/users/${id}`)
      .set("Cookie", as(token));

    expect(res.status).toBe(403);
    expect(await prisma.user.count({ where: { id } })).toBe(1);
  });
});

describe("GET /listings", () => {
  it("returns listings across every owner, not just the caller's", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const one = await createUser({ role: "landlord", email: "one@example.com" });
    const two = await createUser({ role: "landlord", email: "two@example.com" });
    await createListing(one.id);
    await createListing(two.id);

    const res = await request(app).get("/api/admin/listings").set("Cookie", as(token));

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.listings.map((l: { owner: { email: string } }) => l.owner.email)).toEqual(
      expect.arrayContaining(["one@example.com", "two@example.com"]),
    );
  });

  it("carries the readiness gaps that block publication", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const owner = await createUser({ role: "landlord" });
    await createListing(owner.id);

    const res = await request(app).get("/api/admin/listings").set("Cookie", as(token));

    const gaps = res.body.data.listings[0].gaps.map((gap: { field: string }) => gap.field);
    expect(gaps).toEqual(
      expect.arrayContaining(["location", "barangay", "description", "images"]),
    );
  });

  it("filters by status and by owner", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const one = await createUser({ role: "landlord" });
    const two = await createUser({ role: "landlord" });
    await createListing(one.id, { status: "published" });
    await createListing(one.id, { status: "draft" });
    await createListing(two.id, { status: "published" });

    const published = await request(app)
      .get("/api/admin/listings?status=published")
      .set("Cookie", as(token));

    const byOwner = await request(app)
      .get(`/api/admin/listings?ownerId=${one.id}`)
      .set("Cookie", as(token));

    expect(published.body.meta.total).toBe(2);
    expect(byOwner.body.meta.total).toBe(2);
  });
});

describe("GET /overview", () => {
  it("counts users by role and listings by status", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const owner = await createUser({ role: "landlord" });
    await createUser({ role: "renter" });
    await createListing(owner.id, { status: "published" });
    await createListing(owner.id, { status: "draft" });

    const res = await request(app).get("/api/admin/overview").set("Cookie", as(token));
    const { overview } = res.body.data;

    expect(overview.users.total).toBe(3);
    expect(overview.users.byRole).toEqual({ renter: 1, landlord: 1, admin: 1 });
    expect(overview.listings.total).toBe(2);
    expect(overview.listings.byStatus).toEqual({ draft: 1, published: 1, archived: 0 });
  });

  it("counts only the drafts that readiness still blocks", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const owner = await createUser({ role: "landlord" });

    await createListing(owner.id, { status: "draft" });
    await createListing(owner.id, {
      status: "published",
      barangay: "Loyola Heights",
      description: "A real description.",
      lat: 14.6,
      lng: 121.07,
    });

    const res = await request(app).get("/api/admin/overview").set("Cookie", as(token));

    // Only drafts are considered, and the one draft is missing everything.
    expect(res.body.data.overview.listings.blockedByGaps).toBe(1);
  });

  it("reports no published rent rather than a zero when nothing is published", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const owner = await createUser({ role: "landlord" });
    await createListing(owner.id, { status: "draft", rent: 18000 });

    const res = await request(app).get("/api/admin/overview").set("Cookie", as(token));

    expect(res.body.data.overview.publishedRent).toBeNull();
  });

  it("averages rent over published listings only", async () => {
    const { token } = await signIn("boss@example.com", "admin");
    const owner = await createUser({ role: "landlord" });
    await createListing(owner.id, { status: "published", rent: 10000 });
    await createListing(owner.id, { status: "published", rent: 20000 });
    await createListing(owner.id, { status: "draft", rent: 999999 });

    const res = await request(app).get("/api/admin/overview").set("Cookie", as(token));

    expect(res.body.data.overview.publishedRent).toEqual({
      average: 15000,
      min: 10000,
      max: 20000,
    });
  });

  it("returns a full activity window, zero-filled", async () => {
    const { token } = await signIn("boss@example.com", "admin");

    const res = await request(app).get("/api/admin/overview").set("Cookie", as(token));
    const { signupsByDay, listingsByDay } = res.body.data.overview;

    expect(signupsByDay).toHaveLength(30);
    expect(listingsByDay).toHaveLength(30);
    expect(signupsByDay.at(-1)).toMatchObject({ count: 1 });
    expect(signupsByDay[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

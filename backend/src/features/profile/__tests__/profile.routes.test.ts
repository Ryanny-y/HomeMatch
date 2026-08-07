import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { EMPTY_RENTER_PREFERENCE } from "@homematch/shared";
import { app } from "../../../app";
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

function as(token: string | undefined) {
  return cookieHeader({ [ACCESS_COOKIE]: token });
}

describe("role gate", () => {
  it("401s an anonymous caller", async () => {
    expect((await request(app).get("/api/profile")).status).toBe(401);
  });

  it("403s a landlord, who has no renter profile", async () => {
    const res = await request(app)
      .get("/api/profile")
      .set("Cookie", as(await signIn("landlord@example.com", "landlord")));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("403s an admin", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .set("Cookie", as(await signIn("admin@example.com", "admin")))
      .send({ householdSize: 2 });

    expect(res.status).toBe(403);
  });
});

describe("GET /api/profile", () => {
  it("returns an empty profile for a renter who has saved nothing", async () => {
    const res = await request(app)
      .get("/api/profile")
      .set("Cookie", as(await signIn("new@example.com", "renter")));

    expect(res.status).toBe(200);
    // Against the shared constant rather than a copy of it: the point of this
    // test is that the endpoint answers with the documented empty profile, and
    // an inline literal only tests that two lists were edited together.
    expect(res.body.data.preference).toEqual(EMPTY_RENTER_PREFERENCE);
  });
});

describe("PATCH /api/profile", () => {
  it("saves and reloads — the roadmap's definition of done for this stage", async () => {
    const cookie = as(await signIn("renter@example.com", "renter"));

    const saved = await request(app).patch("/api/profile").set("Cookie", cookie).send({
      budget: 18000,
      householdSize: 2,
      wants: ["pets", "parking", "near_transit"],
      otherNeeds: "Ground floor if possible, and somewhere near a train.",
    });

    expect(saved.status).toBe(200);

    const reloaded = await request(app).get("/api/profile").set("Cookie", cookie);

    expect(reloaded.body.data.preference).toMatchObject({
      budget: 18000,
      householdSize: 2,
      wants: ["pets", "parking", "near_transit"],
      otherNeeds: "Ground floor if possible, and somewhere near a train.",
    });
  });

  it("round-trips the preferred areas through Postgres", async () => {
    const cookie = as(await signIn("areas@example.com", "renter"));

    await request(app)
      .patch("/api/profile")
      .set("Cookie", cookie)
      .send({
        preferredCity: "Quezon City",
        preferredBarangays: ["Diliman", "Loyola Heights"],
      });

    const res = await request(app).get("/api/profile").set("Cookie", cookie);

    // A text[] column, so worth reading back rather than trusting the write:
    // ordering is what the catalog filter and the chip row both rely on.
    expect(res.body.data.preference.preferredCity).toBe("Quezon City");
    expect(res.body.data.preference.preferredBarangays).toEqual(["Diliman", "Loyola Heights"]);
  });

  it("lets a renter clear every preferred area", async () => {
    const cookie = as(await signIn("clear-areas@example.com", "renter"));

    await request(app)
      .patch("/api/profile")
      .set("Cookie", cookie)
      .send({ preferredBarangays: ["Diliman"] });
    await request(app)
      .patch("/api/profile")
      .set("Cookie", cookie)
      .send({ preferredBarangays: [] });

    expect(
      (await request(app).get("/api/profile").set("Cookie", cookie)).body.data.preference
        .preferredBarangays,
    ).toEqual([]);
  });

  it("rejects more preferred areas than the cap", async () => {
    const cookie = as(await signIn("too-many@example.com", "renter"));

    const res = await request(app)
      .patch("/api/profile")
      .set("Cookie", cookie)
      .send({
        preferredBarangays: Array.from({ length: 11 }, (_, index) => `Barangay ${index}`),
      });

    expect(res.status).toBe(422);
  });

  it("does not stamp onboardedAt", async () => {
    const cookie = as(await signIn("plain-save@example.com", "renter"));

    await request(app).patch("/api/profile").set("Cookie", cookie).send({ budget: 18000 });

    // Saving preferences and getting through the first-run gate are different
    // events. If a PATCH stamped the date, every profile edit months later
    // would read as a fresh onboarding.
    expect(
      (await request(app).get("/api/profile").set("Cookie", cookie)).body.data.preference
        .onboardedAt,
    ).toBeNull();
  });

  it("leaves untouched fields alone across two partial saves", async () => {
    const cookie = as(await signIn("partial@example.com", "renter"));

    await request(app).patch("/api/profile").set("Cookie", cookie).send({ budget: 18000 });
    await request(app).patch("/api/profile").set("Cookie", cookie).send({ householdSize: 3 });

    const res = await request(app).get("/api/profile").set("Cookie", cookie);

    // A page-level save sends only what changed; a second save must not wipe
    // the first.
    expect(res.body.data.preference.budget).toBe(18000);
    expect(res.body.data.preference.householdSize).toBe(3);
  });

  it("clears a field when sent null", async () => {
    const cookie = as(await signIn("clear@example.com", "renter"));

    await request(app).patch("/api/profile").set("Cookie", cookie).send({ budget: 18000 });
    await request(app).patch("/api/profile").set("Cookie", cookie).send({ budget: null });

    expect(
      (await request(app).get("/api/profile").set("Cookie", cookie)).body.data.preference.budget,
    ).toBeNull();
  });

  it("lets a renter uncheck every want", async () => {
    const cookie = as(await signIn("uncheck@example.com", "renter"));

    await request(app).patch("/api/profile").set("Cookie", cookie).send({ wants: ["pets"] });
    await request(app).patch("/api/profile").set("Cookie", cookie).send({ wants: [] });

    expect(
      (await request(app).get("/api/profile").set("Cookie", cookie)).body.data.preference.wants,
    ).toEqual([]);
  });

  it("422s a budget above the sanity bound", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .set("Cookie", as(await signIn("big@example.com", "renter")))
      .send({ budget: 2_000_000 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("422s an unknown want rather than storing free text in a scored column", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .set("Cookie", as(await signIn("enum@example.com", "renter")))
      .send({ wants: ["rooftop_pool"] });

    expect(res.status).toBe(422);
  });

  it("422s other needs over 500 characters", async () => {
    const res = await request(app)
      .patch("/api/profile")
      .set("Cookie", as(await signIn("long@example.com", "renter")))
      .send({ otherNeeds: "x".repeat(501) });

    expect(res.status).toBe(422);
  });

  it("keeps one renter's profile out of another's", async () => {
    const mine = as(await signIn("mine@example.com", "renter"));
    await request(app).patch("/api/profile").set("Cookie", mine).send({ householdSize: 4 });

    const theirs = as(await signIn("theirs@example.com", "renter"));
    const res = await request(app).get("/api/profile").set("Cookie", theirs);

    // The row is keyed by the token's own user id, so there is no id to tamper
    // with — this asserts that stays true.
    expect(res.body.data.preference.householdSize).toBeNull();
  });
});

describe("POST /api/profile/onboarded", () => {
  it("stamps onboardedAt for a renter who has saved nothing", async () => {
    const cookie = as(await signIn("skipper@example.com", "renter"));

    const res = await request(app).post("/api/profile/onboarded").set("Cookie", cookie);

    // Skipping is a real way through the gate, so it has to work with no row in
    // the table yet.
    expect(res.status).toBe(200);
    expect(res.body.data.preference.onboardedAt).not.toBeNull();
    expect(res.body.data.preference.budget).toBeNull();
  });

  it("keeps the first date when called twice", async () => {
    const cookie = as(await signIn("twice@example.com", "renter"));

    const first = await request(app).post("/api/profile/onboarded").set("Cookie", cookie);
    const second = await request(app).post("/api/profile/onboarded").set("Cookie", cookie);

    // Idempotent by design: a double-submit, a retry, or a later visit to the
    // route must not move the date. This is when they first got through, not
    // when they last touched it.
    expect(second.body.data.preference.onboardedAt).toBe(
      first.body.data.preference.onboardedAt,
    );
  });

  it("leaves saved preferences untouched", async () => {
    const cookie = as(await signIn("saved-then@example.com", "renter"));

    await request(app)
      .patch("/api/profile")
      .set("Cookie", cookie)
      .send({ budget: 18000, preferredBarangays: ["Diliman"] });

    const res = await request(app).post("/api/profile/onboarded").set("Cookie", cookie);

    expect(res.body.data.preference.budget).toBe(18000);
    expect(res.body.data.preference.preferredBarangays).toEqual(["Diliman"]);
    expect(res.body.data.preference.onboardedAt).not.toBeNull();
  });

  it("403s a landlord", async () => {
    const res = await request(app)
      .post("/api/profile/onboarded")
      .set("Cookie", as(await signIn("landlord-gate@example.com", "landlord")));

    expect(res.status).toBe(403);
  });

  it("401s an anonymous caller", async () => {
    expect((await request(app).post("/api/profile/onboarded")).status).toBe(401);
  });
});

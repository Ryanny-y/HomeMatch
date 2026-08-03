import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
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

/**
 * The provider is never called here. `MAPBOX_TOKEN` is unset in test, which is
 * exactly the path worth asserting: a billed endpoint must refuse anonymous
 * callers before it costs anything, and must fail legibly rather than crash
 * when it is not configured.
 */
describe("GET /api/geocode", () => {
  it("refuses an anonymous caller", async () => {
    const res = await request(app).get("/api/geocode").query({ q: "Katipunan Ave" });

    expect(res.status).toBe(401);
  });

  it("refuses a renter", async () => {
    const token = await signIn("renter@example.com", "renter");

    const res = await request(app)
      .get("/api/geocode")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }))
      .query({ q: "Katipunan Ave" });

    expect(res.status).toBe(403);
  });

  it("rejects a query too short to geocode", async () => {
    const token = await signIn("owner@example.com", "landlord");

    const res = await request(app)
      .get("/api/geocode")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }))
      .query({ q: "a" });

    expect(res.status).toBe(422);
  });

  it("says so plainly when no provider is configured", async () => {
    const token = await signIn("owner@example.com", "landlord");

    const res = await request(app)
      .get("/api/geocode")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }))
      .query({ q: "12 Esteban Abada St, Loyola Heights" });

    expect(res.status).toBe(500);
    // Operational, so the message reaches the landlord with the way out in it.
    expect(res.body.error.message).toMatch(/drag the pin/i);
  });
});

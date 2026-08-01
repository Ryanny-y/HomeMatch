import { afterAll, beforeEach, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { app } from "../../../app";
import { prisma } from "../../../lib/prisma";
import { requireAuth, requireRole } from "../../../shared/middleware/requireAuth";
import { errorHandler } from "../../../shared/middleware/errorHandler";
import { ok } from "../../../shared/response/envelope";
import { generateOpaqueToken, hashToken } from "../../../shared/security/token";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "../auth.cookies";
import { closeDatabase, resetDatabase } from "../../../../tests/helpers/db";
import {
  TEST_PASSWORD,
  cookieHeader,
  createUser,
  readCookie,
} from "../../../../tests/helpers/factories";

/**
 * Routes → controller → service → real test database.
 *
 * `app` is imported from `app.ts`; nothing here calls `listen()`. These must run
 * serially — they share one database and truncate it between tests, which is
 * why `fileParallelism` is off in vitest.config.ts.
 */

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

const SIGNUP = {
  email: "maria@example.com",
  password: "correct-horse-9",
  fullName: "Maria Santos",
  role: "renter" as const,
};

describe("POST /api/auth/register", () => {
  it("creates the account and sets both cookies httpOnly", async () => {
    const res = await request(app).post("/api/auth/register").send(SIGNUP);

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(SIGNUP.email);
    expect(res.body.data.user.emailVerified).toBe(false);

    const cookies = res.headers["set-cookie"] as unknown as string[];
    const access = cookies.find((c) => c.startsWith(`${ACCESS_COOKIE}=`));
    const refresh = cookies.find((c) => c.startsWith(`${REFRESH_COOKIE}=`));

    expect(access).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/HttpOnly/i);
    // The long-lived credential is scoped so it is not sent to every route.
    expect(refresh).toMatch(/Path=\/api\/auth/i);
  });

  it("never returns the password hash", async () => {
    const res = await request(app).post("/api/auth/register").send(SIGNUP);
    expect(JSON.stringify(res.body)).not.toContain("argon2");
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/api/auth/register").send(SIGNUP);
    const res = await request(app).post("/api/auth/register").send(SIGNUP);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects a weak password with a field-keyed 422", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...SIGNUP, password: "short" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    /**
     * The 422 shape is a contract with `frontend/src/lib/api.ts`, whose
     * `ApiError.fieldErrors` walks `details.issues` and renders each message
     * under the matching input. If this assertion breaks, every auth form
     * silently degrades to one generic form-level error.
     */
    const issues = res.body.error.details.issues as { path: string[] }[];
    expect(issues.some((i) => i.path.includes("password"))).toBe(true);
  });

  it("refuses to mint an admin through the public endpoint", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...SIGNUP, role: "admin" });

    expect(res.status).toBe(422);
  });
});

describe("POST /api/auth/login", () => {
  it("signs in with correct credentials", async () => {
    const user = await createUser({ email: "sam@example.com" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
  });

  it("is case-insensitive on the email", async () => {
    await createUser({ email: "sam@example.com" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "  SAM@Example.COM ", password: TEST_PASSWORD });

    expect(res.status).toBe(200);
  });

  it("answers a wrong password and an unknown email identically", async () => {
    await createUser({ email: "sam@example.com" });

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "sam@example.com", password: "wrong-password-1" });

    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password-1" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Byte-identical bodies, or the endpoint is an account-existence oracle.
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });
});

describe("GET /api/auth/me", () => {
  it("401s without a cookie", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("401s on a tampered token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: "not.a.jwt" }));

    expect(res.status).toBe(401);
  });

  it("returns the current user with a valid cookie", async () => {
    const login = await request(app).post("/api/auth/register").send(SIGNUP);
    const access = readCookie(
      login.headers["set-cookie"] as unknown as string[],
      ACCESS_COOKIE,
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: access }));

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(SIGNUP.email);
  });
});

describe("POST /api/auth/refresh", () => {
  async function signIn() {
    const res = await request(app).post("/api/auth/register").send(SIGNUP);
    const cookies = res.headers["set-cookie"] as unknown as string[];
    return {
      refresh: readCookie(cookies, REFRESH_COOKIE),
      access: readCookie(cookies, ACCESS_COOKIE),
    };
  }

  it("issues a new pair and rotates the refresh token", async () => {
    const { refresh } = await signIn();

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader({ [REFRESH_COOKIE]: refresh }));

    expect(res.status).toBe(200);

    const rotated = readCookie(
      res.headers["set-cookie"] as unknown as string[],
      REFRESH_COOKIE,
    );
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(refresh);
  });

  it("401s without a refresh cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
  });

  /**
   * The refresh stampede regression test.
   *
   * These two requests MUST be genuinely concurrent — `Promise.all`, not two
   * awaits. Run sequentially, the second lands outside the grace window's
   * intent and this passes even when the bug is fully present.
   *
   * Without the grace window, the second request finds an already-rotated token,
   * reads it as theft, revokes the family, and the user is silently signed out
   * while doing nothing wrong. That is the normal path for any page making more
   * than one API call.
   */
  it("lets two concurrent refreshes both succeed", async () => {
    const { refresh } = await signIn();
    const cookie = cookieHeader({ [REFRESH_COOKIE]: refresh });

    const [first, second] = await Promise.all([
      request(app).post("/api/auth/refresh").set("Cookie", cookie),
      request(app).post("/api/auth/refresh").set("Cookie", cookie),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    // And the session must still be alive afterwards — the point of the test is
    // that nothing got revoked.
    const survivor = readCookie(
      second.headers["set-cookie"] as unknown as string[],
      REFRESH_COOKIE,
    );
    const after = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader({ [REFRESH_COOKIE]: survivor }));

    expect(after.status).toBe(200);
  });

  it("revokes the family when a spent token is replayed after the grace window", async () => {
    const { refresh } = await signIn();
    const cookie = cookieHeader({ [REFRESH_COOKIE]: refresh });

    const rotated = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    const successor = readCookie(
      rotated.headers["set-cookie"] as unknown as string[],
      REFRESH_COOKIE,
    );

    // Age the spent token past the grace window without waiting 10 real seconds.
    await prisma.refreshToken.updateMany({
      where: { rotatedAt: { not: null } },
      data: { rotatedAt: new Date(Date.now() - 60_000) },
    });

    const replay = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(replay.status).toBe(401);

    // The successor dies with the family — that is the whole point. Both the
    // thief and the legitimate holder are cut off, because there is no way to
    // tell which is which.
    const afterRevoke = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader({ [REFRESH_COOKIE]: successor }));

    expect(afterRevoke.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears cookies and kills the refresh token", async () => {
    const reg = await request(app).post("/api/auth/register").send(SIGNUP);
    const refresh = readCookie(
      reg.headers["set-cookie"] as unknown as string[],
      REFRESH_COOKIE,
    );

    const out = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookieHeader({ [REFRESH_COOKIE]: refresh }));

    expect(out.status).toBe(200);

    const cleared = out.headers["set-cookie"] as unknown as string[];
    expect(cleared.some((c) => c.startsWith(`${ACCESS_COOKIE}=;`))).toBe(true);

    const reuse = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader({ [REFRESH_COOKIE]: refresh }));

    expect(reuse.status).toBe(401);
  });

  it("succeeds with no session at all", async () => {
    // A browser holding a stale cookie must be able to get rid of it.
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
  });
});

describe("email verification", () => {
  it("verifies with a real token and flips emailVerified", async () => {
    await request(app).post("/api/auth/register").send(SIGNUP);

    // The raw token only ever existed in the email. The test reproduces it the
    // same way the service stores it — by hash — rather than reaching into a
    // mock, so this exercises the real single-use path.
    const raw = generateOpaqueToken();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: SIGNUP.email },
      select: { id: true },
    });
    await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: raw });

    expect(res.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    expect(after.emailVerified).toBe(true);

    // Single use.
    const again = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: raw });
    expect(again.status).toBe(401);
  });

  it("reports success for an unknown address on resend", async () => {
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "ghost@example.com" });

    // Anything else turns this into an unauthenticated existence oracle.
    expect(res.status).toBe(200);
  });
});

describe("password reset", () => {
  /** Mints a real reset token the same way the service stores one. */
  async function issueResetToken(email: string): Promise<string> {
    const raw = generateOpaqueToken();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true },
    });

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return raw;
  }

  it("returns 200 for an address that does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "ghost@example.com" });

    // Anything else makes this an unauthenticated account-existence oracle,
    // and the UI already promises a non-committal "if an account exists".
    expect(res.status).toBe(200);
  });

  it("issues a token for a real account, and a second request kills the first", async () => {
    const user = await createUser({ email: "sam@example.com" });

    const first = await issueResetToken(user.email);
    await request(app).post("/api/auth/forgot-password").send({ email: user.email });

    // Otherwise every link ever sent stays live for its full hour.
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: first, password: "brand-new-pass-1" });

    expect(res.status).toBe(401);
  });

  it("replaces the password: the old one stops working and the new one starts", async () => {
    const user = await createUser({ email: "sam@example.com" });
    const token = await issueResetToken(user.email);

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-pass-1" });

    expect(reset.status).toBe(200);
    // No session handed back — the user is sent to the login form.
    expect(reset.headers["set-cookie"]).toBeUndefined();

    const withOld = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });
    expect(withOld.status).toBe(401);

    const withNew = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "brand-new-pass-1" });
    expect(withNew.status).toBe(200);
  });

  /**
   * The test this feature exists to pass.
   *
   * `ResetPasswordForm` tells the user "any other devices already signed in
   * have been logged out". If that is not true, someone who resets a password
   * *because* their account was compromised leaves the intruder signed in —
   * the recovery does nothing and the user believes it did.
   */
  it("kills sessions that existed before the reset", async () => {
    const user = await createUser({ email: "sam@example.com" });

    const signedIn = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });
    const staleRefresh = readCookie(
      signedIn.headers["set-cookie"] as unknown as string[],
      REFRESH_COOKIE,
    );

    // That session is alive right now.
    const before = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader({ [REFRESH_COOKIE]: staleRefresh }));
    expect(before.status).toBe(200);

    const rotated = readCookie(
      before.headers["set-cookie"] as unknown as string[],
      REFRESH_COOKIE,
    );

    const token = await issueResetToken(user.email);
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-pass-1" });

    const after = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieHeader({ [REFRESH_COOKIE]: rotated }));

    expect(after.status).toBe(401);
  });

  it("marks the address verified, because following the link proved the mailbox", async () => {
    const user = await createUser({ email: "sam@example.com", emailVerified: false });
    const token = await issueResetToken(user.email);

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-pass-1" });

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    expect(after.emailVerified).toBe(true);
  });

  it("rejects a token that was already used", async () => {
    const user = await createUser({ email: "sam@example.com" });
    const token = await issueResetToken(user.email);

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-pass-1" });

    const again = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "another-password-2" });

    expect(again.status).toBe(401);

    // And the second attempt must not have changed anything.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "brand-new-pass-1" });
    expect(login.status).toBe(200);
  });

  it("rejects an expired token without saying it was ever real", async () => {
    const user = await createUser({ email: "sam@example.com" });
    const token = await issueResetToken(user.email);

    await prisma.passwordResetToken.updateMany({
      where: {},
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const expired = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-pass-1" });

    const nonsense = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "never-existed", password: "brand-new-pass-1" });

    expect(expired.status).toBe(401);
    expect(nonsense.body).toEqual(expired.body);
  });

  it("enforces password strength on the new password", async () => {
    const user = await createUser({ email: "sam@example.com" });
    const token = await issueResetToken(user.email);

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "short" });

    expect(res.status).toBe(422);
    // The token must survive a rejected attempt, or a typo burns the link.
    const retry = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "brand-new-pass-1" });
    expect(retry.status).toBe(200);
  });
});

/**
 * RBAC — the roadmap's stated acceptance criterion ("wrong-role access returns
 * 403") and the only thing that actually proves the guard works.
 *
 * A throwaway app is mounted here because no real endpoint uses `requireRole`
 * yet. Testing it against a route invented for the test is honest; shipping a
 * dead admin endpoint just to have something to point at would not be.
 */
describe("requireRole", () => {
  /**
   * Standalone, not `guarded.use(app)`.
   *
   * Mounting the real app first means its `notFoundHandler` — which is
   * correctly the last thing in the stack — answers before any route added
   * afterwards is reached, and every assertion here comes back 404. The guard
   * under test needs only a cookie parser and the error handler.
   */
  const guarded = express();
  guarded.use(cookieParser());
  guarded.get(
    "/__test/admin-only",
    requireAuth,
    requireRole("admin"),
    (_req, res) => {
      res.json(ok({ secret: true }));
    },
  );
  guarded.use(errorHandler);

  async function accessTokenFor(role: "renter" | "admin") {
    if (role === "admin") {
      await createUser({ email: "boss@example.com", role: "admin" });
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "boss@example.com", password: TEST_PASSWORD });
      return readCookie(res.headers["set-cookie"] as unknown as string[], ACCESS_COOKIE);
    }

    const res = await request(app).post("/api/auth/register").send(SIGNUP);
    return readCookie(res.headers["set-cookie"] as unknown as string[], ACCESS_COOKIE);
  }

  it("403s a renter on an admin-only route", async () => {
    const token = await accessTokenFor("renter");

    const res = await request(guarded)
      .get("/__test/admin-only")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }));

    // 403, not 401 — signing in again would not help, and the client renders
    // the two differently.
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("401s an anonymous caller on the same route", async () => {
    const res = await request(guarded).get("/__test/admin-only");
    expect(res.status).toBe(401);
  });

  it("lets an admin through", async () => {
    const token = await accessTokenFor("admin");

    const res = await request(guarded)
      .get("/__test/admin-only")
      .set("Cookie", cookieHeader({ [ACCESS_COOKIE]: token }));

    expect(res.status).toBe(200);
  });
});

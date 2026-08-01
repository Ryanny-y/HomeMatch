import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Service unit tests. No database.
 *
 * `lib/prisma` is mocked rather than the repository, per `backend/CLAUDE.md`.
 * That is the more demanding choice — the repository's `select` clauses and
 * transaction shapes run for real — and it is why these tests catch a query
 * change, not just a logic change.
 *
 * The mailer is stubbed too: a unit test that sends email is a unit test that
 * costs money.
 */

/**
 * `vi.hoisted` rather than plain `const`.
 *
 * Vitest lifts every `vi.mock` call above the imports so the mock is registered
 * before the real module loads. A factory referencing an ordinary `const`
 * declared below would therefore hit it in the temporal dead zone. `vi.hoisted`
 * runs its body up there too, which is what makes the mocks safe to reference —
 * and lets the imports below stay static.
 *
 * They have to be static: these files compile as CommonJS under
 * `module: nodenext`, where a top-level `await import()` is a TypeScript error
 * (TS1309). Vitest's own resolver is happy with it, so `npm run typecheck` is
 * the only thing that catches it.
 */
const {
  prismaMock,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyPasswordMock,
} = vi.hoisted(
  () => ({
    prismaMock: {
      user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      verificationToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
      },
      passwordResetToken: {
        findUnique: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    verifyPasswordMock: vi.fn(),
  }),
);

vi.mock("../../../lib/prisma", () => ({
  prisma: prismaMock,
  disconnectPrisma: vi.fn(),
}));

vi.mock("../../../shared/mail/mailer", () => ({
  mailer: { sendVerificationEmail, sendPasswordResetEmail },
}));

vi.mock("../../../shared/security/password", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../../shared/security/password")
  >();
  return {
    ...actual,
    // Real argon2 takes ~50ms per call; across a suite that is minutes of
    // waiting to test branching that has nothing to do with hashing.
    hashPassword: vi.fn(async () => "$argon2id$fake"),
    verifyPassword: verifyPasswordMock,
  };
});

import * as service from "../auth.service";
import { ConflictError, UnauthorizedError } from "../../../shared/errors/AppError";

/** Local alias so the assertions below read the same as before. */
const verifyPassword = verifyPasswordMock;

const USER = {
  id: "user-1",
  email: "maria@example.com",
  fullName: "Maria Santos",
  role: "renter" as const,
  emailVerified: false,
  passwordHash: "$argon2id$stored",
};

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction receives an array of already-built promises; resolving them is
  // what the real client does.
  prismaMock.$transaction.mockImplementation((ops: unknown) =>
    Array.isArray(ops) ? Promise.all(ops) : Promise.resolve([]),
  );
});

describe("login", () => {
  it("rejects a wrong password without revealing that the account exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);
    verifyPassword.mockResolvedValue(false);

    await expect(service.login({ email: USER.email, password: "nope" })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("gives an unknown email the identical error to a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);
    verifyPassword.mockResolvedValue(false);
    const wrongPassword = await service
      .login({ email: USER.email, password: "nope" })
      .catch((e: Error) => e);

    prismaMock.user.findUnique.mockResolvedValue(null);
    verifyPassword.mockResolvedValue(false);
    const unknownEmail = await service
      .login({ email: "nobody@example.com", password: "nope" })
      .catch((e: Error) => e);

    // Byte-identical. Any divergence here undoes the decoy hash entirely — the
    // attacker stops needing timing and just reads the message.
    expect((unknownEmail as Error).message).toBe((wrongPassword as Error).message);
    expect((unknownEmail as Error).constructor).toBe(
      (wrongPassword as Error).constructor,
    );
  });

  it("still runs a password verification when the email is unknown", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    verifyPassword.mockResolvedValue(false);

    await service.login({ email: "ghost@example.com", password: "x" }).catch(() => {});

    /**
     * The decoy, asserted behaviourally rather than by wall clock.
     *
     * Timing the two paths and comparing durations would be flaky on a loaded
     * CI box. What actually matters is that the expensive work happens on both
     * paths — so assert the call, which is deterministic.
     */
    expect(verifyPassword).toHaveBeenCalledTimes(1);
    expect(verifyPassword.mock.calls[0]?.[1]).toMatch(/^\$argon2id\$/);
  });

  it("normalises the email before looking it up", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);
    verifyPassword.mockResolvedValue(true);
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-1" });

    await service.login({ email: "  MARIA@Example.COM  ", password: "ok" });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "maria@example.com" } }),
    );
  });
});

describe("register", () => {
  it("refuses a duplicate email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);

    await expect(
      service.register({
        email: USER.email,
        password: "correct-horse-9",
        fullName: "Maria",
        role: "renter",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("translates a lost insert race into the same conflict", async () => {
    // Both requests pass the existence check; the unique index decides it.
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );

    await expect(
      service.register({
        email: USER.email,
        password: "correct-horse-9",
        fullName: "Maria",
        role: "renter",
      }),
    ).rejects.toThrow(ConflictError);
  });

  it("sends a verification email and issues a session", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(USER);
    prismaMock.verificationToken.create.mockResolvedValue({ id: "vt-1" });
    prismaMock.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-1" });

    const session = await service.register({
      email: USER.email,
      password: "correct-horse-9",
      fullName: "Maria Santos",
      role: "renter",
    });

    expect(sendVerificationEmail).toHaveBeenCalledOnce();
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    // The password hash must never reach the caller.
    expect(JSON.stringify(session.user)).not.toContain("argon2");
  });
});

describe("refresh", () => {
  const live = {
    id: "rt-1",
    familyId: "fam-1",
    userId: USER.id,
    expiresAt: new Date(Date.now() + 60_000),
    rotatedAt: null,
    revokedAt: null,
  };

  it("rotates a live token", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(live);
    prismaMock.user.findUnique.mockResolvedValue(USER);
    prismaMock.refreshToken.update.mockResolvedValue({ id: "rt-1" });
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-2" });

    const session = await service.refresh("raw-token");

    expect(session.refreshToken).toBeTruthy();
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rt-1" },
        data: expect.objectContaining({ rotatedAt: expect.any(Date) }),
      }),
    );
  });

  it("revokes the whole family when a spent token is replayed later", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      ...live,
      rotatedAt: new Date(Date.now() - 60_000), // well past the grace window
    });
    prismaMock.user.findUnique.mockResolvedValue(USER);
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 3 });

    await expect(service.refresh("stolen")).rejects.toThrow(UnauthorizedError);

    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: "fam-1", revokedAt: null },
      }),
    );
  });

  it("tolerates a replay inside the grace window instead of revoking", async () => {
    // The stampede: a second parallel request arriving milliseconds later.
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      ...live,
      rotatedAt: new Date(Date.now() - 500),
    });
    prismaMock.user.findUnique.mockResolvedValue(USER);
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-3" });

    const session = await service.refresh("same-token");

    expect(session.refreshToken).toBeTruthy();
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("does not revoke the family when a token has merely expired", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      ...live,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.refresh("old")).rejects.toThrow(UnauthorizedError);

    // Someone who closed their laptop for a week is not a thief.
    expect(prismaMock.refreshToken.updateMany).not.toHaveBeenCalled();
  });

  it("re-reads the role from the database rather than trusting the old token", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue(live);
    prismaMock.user.findUnique.mockResolvedValue({ ...USER, role: "admin" });
    prismaMock.refreshToken.update.mockResolvedValue({ id: "rt-1" });
    prismaMock.refreshToken.create.mockResolvedValue({ id: "rt-2" });

    const session = await service.refresh("raw-token");

    expect(session.user.role).toBe("admin");
  });
});

describe("verifyEmail", () => {
  it("rejects a token that was already consumed", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "vt-1",
      userId: USER.id,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
    });

    await expect(service.verifyEmail("used")).rejects.toThrow(UnauthorizedError);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "vt-1",
      userId: USER.id,
      expiresAt: new Date(Date.now() - 1),
      consumedAt: null,
    });

    await expect(service.verifyEmail("stale")).rejects.toThrow(UnauthorizedError);
  });

  it("rejects when a simultaneous click already consumed it", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      id: "vt-1",
      userId: USER.id,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
    });
    // updateMany matched nothing: the other request won the race.
    prismaMock.$transaction.mockResolvedValue([{ count: 0 }, { id: USER.id }]);

    await expect(service.verifyEmail("raced")).rejects.toThrow(UnauthorizedError);
  });
});

describe("resendVerification", () => {
  it("reports success for an address that does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    // Must not throw: an error here is an account-existence oracle on an
    // endpoint that needs no credentials to call.
    await expect(service.resendVerification("ghost@example.com")).resolves.toBeUndefined();
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("does not resend to an already-verified account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...USER, emailVerified: true });

    await service.resendVerification(USER.email);

    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset", () => {
  it("resolves silently and sends nothing for an unknown address", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(service.requestPasswordReset("ghost@example.com")).resolves.toBeUndefined();

    // The integration test can only see the 200; this is what proves no email
    // went out, which is the half an attacker could otherwise time.
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("stores only the hash of the token it emails", async () => {
    prismaMock.user.findUnique.mockResolvedValue(USER);
    prismaMock.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.passwordResetToken.create.mockResolvedValue({ id: "prt-1" });

    await service.requestPasswordReset(USER.email);

    const emailed = sendPasswordResetEmail.mock.calls[0]?.[1] as string;
    const stored = prismaMock.passwordResetToken.create.mock.calls[0]?.[0] as {
      data: { tokenHash: string };
    };

    // A database dump must not yield working reset links.
    expect(stored.data.tokenHash).not.toBe(emailed);
    expect(stored.data.tokenHash).toHaveLength(64);
  });

  it("normalises the email before looking it up", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await service.requestPasswordReset("  SAM@Example.COM ");

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "sam@example.com" } }),
    );
  });
});

describe("resetPassword", () => {
  const live = {
    id: "prt-1",
    userId: USER.id,
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  };

  it("rejects a consumed token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      ...live,
      consumedAt: new Date(),
    });

    await expect(service.resetPassword("used", "brand-new-pass-1")).rejects.toThrow(
      UnauthorizedError,
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      ...live,
      expiresAt: new Date(Date.now() - 1),
    });

    await expect(service.resetPassword("stale", "brand-new-pass-1")).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("gives missing, consumed and expired tokens the identical message", async () => {
    const messages: string[] = [];

    for (const row of [
      null,
      { ...live, consumedAt: new Date() },
      { ...live, expiresAt: new Date(Date.now() - 1) },
    ]) {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(row);
      const error = await service
        .resetPassword("t", "brand-new-pass-1")
        .catch((e: Error) => e);
      messages.push((error as Error).message);
    }

    // Distinguishing them tells someone holding a stale token whether it was
    // ever real, and for which account.
    expect(new Set(messages).size).toBe(1);
  });

  it("rejects when a simultaneous click already consumed the token", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(live);
    // updateMany matched nothing: the other request won the race.
    prismaMock.$transaction.mockResolvedValue([{ count: 0 }, { id: USER.id }, { count: 0 }]);

    await expect(service.resetPassword("raced", "brand-new-pass-1")).rejects.toThrow(
      UnauthorizedError,
    );
  });
});

describe("logout", () => {
  it("revokes the entire family, not just the token presented", async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: "rt-1",
      familyId: "fam-1",
      userId: USER.id,
      expiresAt: new Date(Date.now() + 60_000),
      rotatedAt: null,
      revokedAt: null,
    });
    prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 2 });

    await service.logout("raw");

    // Otherwise other tabs keep refreshing and the user is not signed out.
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: "fam-1", revokedAt: null } }),
    );
  });

  it("succeeds when there is no cookie at all", async () => {
    await expect(service.logout(undefined)).resolves.toBeUndefined();
    expect(prismaMock.refreshToken.findUnique).not.toHaveBeenCalled();
  });
});

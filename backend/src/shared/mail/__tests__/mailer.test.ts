import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Covers the Resend adapter, which until now had none: the app's own tests use
 * the noop mailer, so every branch in here — retry, idempotency, the 403
 * diagnostic — ran for the first time in production traffic.
 *
 * The `resend` package and the logger are both mocked. `env` is mocked too,
 * because `resolveMailer()` reads `isTest`/`isProduction` at call time and the
 * suite runs with NODE_ENV=test, which would otherwise always yield the noop.
 */
const { sendMock, loggerMock, envMock } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  envMock: {
    RESEND_API_KEY: "re_test_key",
    MAIL_FROM: "HomeMatch <onboarding@resend.dev>",
    PUBLIC_APP_URL: "http://localhost:3000",
    isTest: false,
    isProduction: false,
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("../../logger", () => ({ logger: loggerMock }));
vi.mock("../../config/env", () => ({ env: envMock }));

import { resolveMailer } from "../mailer";

const OK = { data: { id: "email-1" }, error: null };

function failure(statusCode: number | null, name = "application_error") {
  return { data: null, error: { message: "provider says no", statusCode, name } };
}

beforeEach(() => {
  vi.clearAllMocks();
  envMock.isProduction = false;
  envMock.isTest = false;
  envMock.RESEND_API_KEY = "re_test_key";
  // Backoff sleeps are real timers; faking them keeps the retry tests instant.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("sending", () => {
  it("sends once and logs success", async () => {
    sendMock.mockResolvedValue(OK);

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    expect(sendMock).toHaveBeenCalledOnce();
    expect(loggerMock.info).toHaveBeenCalledWith(
      // `kind` distinguishes the two templates now that both share one send path.
      expect.objectContaining({
        to: "sam@example.com",
        kind: "verify",
        emailId: "email-1",
      }),
      "Email sent",
    );
  });

  it("puts the verification link in the email body, pointing at PUBLIC_APP_URL", async () => {
    sendMock.mockResolvedValue(OK);

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-abc");

    const payload = sendMock.mock.calls[0]?.[0] as { html: string; text: string };
    const expected = "http://localhost:3000/verify-email?token=tok-abc";

    // Both parts carry it: a text/plain alternative is what makes the mail
    // usable in a client that blocks HTML, and it helps deliverability.
    expect(payload.html).toContain(expected);
    expect(payload.text).toContain(expected);
  });
});

describe("password reset email", () => {
  it("links to /reset-password, not the verification page", async () => {
    sendMock.mockResolvedValue(OK);

    await resolveMailer().sendPasswordResetEmail("sam@example.com", "tok-r");

    const payload = sendMock.mock.calls[0]?.[0] as { html: string; text: string };
    const expected = "http://localhost:3000/reset-password?token=tok-r";

    expect(payload.html).toContain(expected);
    expect(payload.text).toContain(expected);
    expect(payload.html).not.toContain("/verify-email");
  });

  it("states the 60-minute expiry the forgot-password screen promises", async () => {
    sendMock.mockResolvedValue(OK);

    await resolveMailer().sendPasswordResetEmail("sam@example.com", "tok-r");

    const payload = sendMock.mock.calls[0]?.[0] as { text: string; subject: string };

    // `ForgotPasswordForm` tells the user "expires in 60 minutes" as a fact. If
    // this drifts from the TTL in the service, the app lies to the user.
    expect(payload.text).toContain("60 minutes");
    expect(payload.text).toContain("works once");
    expect(payload.subject).toMatch(/reset/i);
  });

  it("uses a different idempotency key from a verification email for the same token", async () => {
    sendMock.mockResolvedValue(OK);
    const mailer = resolveMailer();

    await mailer.sendVerificationEmail("sam@example.com", "same-token");
    await mailer.sendPasswordResetEmail("sam@example.com", "same-token");

    const verify = (sendMock.mock.calls[0]?.[1] as { idempotencyKey: string }).idempotencyKey;
    const reset = (sendMock.mock.calls[1]?.[1] as { idempotencyKey: string }).idempotencyKey;

    // Sharing a key would let Resend deduplicate two genuinely different emails
    // into one, and the user would silently never receive the second.
    expect(verify).not.toBe(reset);
    expect(reset).toMatch(/^reset-/);
  });

  it("retries and diagnoses exactly like the verification email", async () => {
    sendMock.mockResolvedValueOnce(failure(429)).mockResolvedValueOnce(OK);

    await resolveMailer().sendPasswordResetEmail("sam@example.com", "tok-r");

    // The point of sharing one send path: the second template cannot quietly
    // lose the retry behaviour.
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it("never logs the reset link in production", async () => {
    envMock.isProduction = true;
    sendMock.mockResolvedValue(OK);

    await resolveMailer().sendPasswordResetEmail("sam@example.com", "tok-secret-reset");

    const logged = JSON.stringify([
      loggerMock.info.mock.calls,
      loggerMock.warn.mock.calls,
      loggerMock.error.mock.calls,
    ]);

    // A reset link is the most powerful credential this system emails.
    expect(logged).not.toContain("tok-secret-reset");
  });

  it("logs the reset link in development so the flow is testable", async () => {
    sendMock.mockResolvedValue(failure(403, "validation_error"));

    await resolveMailer().sendPasswordResetEmail("other@example.com", "tok-r");

    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({ link: expect.stringContaining("reset-password") }),
      expect.stringContaining("development only"),
    );
  });
});

describe("retry", () => {
  it("retries a 429 and succeeds on a later attempt", async () => {
    // Resend's default limit is 2 requests/second, so this is the realistic
    // failure whenever two people sign up at once.
    sendMock.mockResolvedValueOnce(failure(429)).mockResolvedValueOnce(OK);

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it("retries a 500", async () => {
    sendMock.mockResolvedValueOnce(failure(503)).mockResolvedValueOnce(OK);

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network failure, which the SDK reports as statusCode null", async () => {
    sendMock.mockResolvedValueOnce(failure(null)).mockResolvedValueOnce(OK);

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a 403", async () => {
    sendMock.mockResolvedValue(failure(403, "validation_error"));

    await resolveMailer().sendVerificationEmail("other@example.com", "tok-1");

    // A rejected recipient is a configuration error: it will fail identically
    // every time, so retrying only triples the latency of a certain failure.
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("does not retry a 422", async () => {
    sendMock.mockResolvedValue(failure(422, "validation_error"));

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("gives up after three attempts and logs an error", async () => {
    sendMock.mockResolvedValue(failure(429));

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(loggerMock.error).toHaveBeenCalledOnce();
  });
});

describe("idempotency", () => {
  it("sends the same key on every retry of one message", async () => {
    sendMock.mockResolvedValueOnce(failure(429)).mockResolvedValueOnce(OK);

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    const first = sendMock.mock.calls[0]?.[1] as { idempotencyKey: string };
    const second = sendMock.mock.calls[1]?.[1] as { idempotencyKey: string };

    // Without this, a retry after a timeout where the request actually landed
    // delivers a second copy of the email.
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
    expect(first.idempotencyKey).toMatch(/^verify-/);
  });

  it("derives the key from the token hash, never the token itself", async () => {
    sendMock.mockResolvedValue(OK);

    await resolveMailer().sendVerificationEmail("sam@example.com", "super-secret-token");

    const { idempotencyKey } = sendMock.mock.calls[0]?.[1] as {
      idempotencyKey: string;
    };

    // The key is metadata handed to a third party; the raw token is a live
    // credential and must not be it.
    expect(idempotencyKey).not.toContain("super-secret-token");
  });

  it("uses a different key for a different token", async () => {
    sendMock.mockResolvedValue(OK);
    const mailer = resolveMailer();

    await mailer.sendVerificationEmail("sam@example.com", "tok-a");
    await mailer.sendVerificationEmail("sam@example.com", "tok-b");

    const a = (sendMock.mock.calls[0]?.[1] as { idempotencyKey: string }).idempotencyKey;
    const b = (sendMock.mock.calls[1]?.[1] as { idempotencyKey: string }).idempotencyKey;

    // Otherwise a resent verification would be deduplicated away by Resend.
    expect(a).not.toBe(b);
  });
});

describe("diagnostics", () => {
  it("explains a 403 rather than echoing the provider message", async () => {
    sendMock.mockResolvedValue(failure(403, "validation_error"));

    await resolveMailer().sendVerificationEmail("other@example.com", "tok-1");

    const [, message] = loggerMock.error.mock.calls[0] as [unknown, string];
    expect(message).toContain("resend.com/domains");
    expect(message).toContain("account");
  });

  it("names the reserved-domain rejection, which is a 422 and not the 403", async () => {
    // Confirmed against the live API: Resend has two distinct guards here, and
    // the 422 is the one a developer hits first by typing test@example.com.
    sendMock.mockResolvedValue({
      data: null,
      error: {
        message:
          "Invalid `to` field. Please use our testing email address instead of domains like `example.com`.",
        statusCode: 422,
        name: "validation_error",
      },
    });

    await resolveMailer().sendVerificationEmail("test@example.com", "tok-1");

    const [, message] = loggerMock.error.mock.calls[0] as [unknown, string];
    expect(message).toContain("Reserved domains");
  });

  it("names the rate limit when retries are exhausted", async () => {
    sendMock.mockResolvedValue(failure(429));

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    const [, message] = loggerMock.error.mock.calls[0] as [unknown, string];
    expect(message).toContain("rate limit");
  });
});

describe("development link logging", () => {
  it("logs the link alongside the real send in development", async () => {
    sendMock.mockResolvedValue(OK);

    await resolveMailer().sendVerificationEmail("anyone@example.com", "tok-1");

    // The regression this guards: with a key present the real adapter is
    // selected, and signing up as anyone but the Resend account owner 403s.
    // Without the logged link, the flow is untestable locally.
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({
        link: "http://localhost:3000/verify-email?token=tok-1",
      }),
      expect.stringContaining("development only"),
    );
  });

  it("still logs the link when the send is rejected", async () => {
    sendMock.mockResolvedValue(failure(403, "validation_error"));

    await resolveMailer().sendVerificationEmail("other@example.com", "tok-1");

    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({ link: expect.stringContaining("tok-1") }),
      expect.any(String),
    );
  });

  it("never logs the link or token in production", async () => {
    envMock.isProduction = true;
    sendMock.mockResolvedValue(failure(403, "validation_error"));

    await resolveMailer().sendVerificationEmail("someone@example.com", "tok-secret");

    // A verification link is a live single-use credential, and production logs
    // travel further than databases do.
    const everythingLogged = JSON.stringify([
      loggerMock.info.mock.calls,
      loggerMock.warn.mock.calls,
      loggerMock.error.mock.calls,
    ]);

    expect(everythingLogged).not.toContain("tok-secret");
    expect(everythingLogged).not.toContain("verify-email?token");
  });
});

describe("mailer selection", () => {
  it("logs the link instead of sending when no key is configured", async () => {
    envMock.RESEND_API_KEY = "";

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    expect(sendMock).not.toHaveBeenCalled();
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ link: expect.stringContaining("tok-1") }),
      expect.stringContaining("No RESEND_API_KEY"),
    );
  });

  it("sends nothing at all under NODE_ENV=test", async () => {
    envMock.isTest = true;

    await resolveMailer().sendVerificationEmail("sam@example.com", "tok-1");

    // A suite that sends real mail costs money and spams people.
    expect(sendMock).not.toHaveBeenCalled();
    expect(loggerMock.info).not.toHaveBeenCalled();
  });
});

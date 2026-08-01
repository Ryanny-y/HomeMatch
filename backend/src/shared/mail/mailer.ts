import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "../logger";
import { hashToken } from "../security/token";

export type Mailer = {
  sendVerificationEmail(to: string, token: string): Promise<void>;
};

function verificationUrl(token: string): string {
  const url = new URL("/verify-email", env.PUBLIC_APP_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

function verificationBody(link: string): { html: string; text: string } {
  return {
    text: [
      "Confirm your email to finish setting up HomeMatch.",
      "",
      link,
      "",
      "This link works once and expires in 24 hours.",
      "If you didn't create a HomeMatch account, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.6;color:#0f172a">
        <p>Confirm your email to finish setting up HomeMatch.</p>
        <p><a href="${link}" style="color:#2563eb">Confirm my email</a></p>
        <p style="color:#64748b;font-size:14px">
          This link works once and expires in 24 hours.<br>
          If you didn't create a HomeMatch account, you can ignore this email.
        </p>
      </div>
    `.trim(),
  };
}

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 400;

type SendError = { message: string; statusCode: number | null; name: string };

function isRetryable(error: SendError): boolean {
  if (error.statusCode === null) return true;
  if (error.statusCode === 429) return true;
  return error.statusCode >= 500;
}

function backoffMs(attempt: number): number {
  // 400ms, 800ms. Jitter avoids two processes that failed together retrying in
  // lockstep and colliding on the same rate limit a second time.
  return BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Turns a provider error into something worth waking up to.
 *
 * The 403 case has exactly one cause in this configuration and Resend's own
 * message does not say so: with no verified domain, the shared `resend.dev`
 * sender may only deliver to the Resend account owner's address. Without this
 * translation the log reads as a generic permissions error and the reader has
 * to go and rediscover the rule.
 */
function describeFailure(error: SendError): string {
  // Both of these were confirmed against the live API rather than assumed —
  // they are two different guards that are easy to mistake for each other.
  if (error.statusCode === 403) {
    return (
      "Resend refused the recipient. With no verified domain, the shared " +
      "onboarding@resend.dev sender can only deliver to the Resend account " +
      "owner's own address. Verify a domain at resend.com/domains and set " +
      "MAIL_FROM to an address on it to reach anyone else."
    );
  }

  if (error.statusCode === 422 && error.message.includes("`to` field")) {
    // Resend rejects reserved documentation domains outright — a separate rule
    // from the owner restriction above, and the one a developer trips first,
    // because `test@example.com` is what everyone types.
    return (
      "Resend rejected the recipient domain. Reserved domains like example.com " +
      "are refused outright — use a real address (in development the " +
      "verification link is logged, so any address still works for testing)."
    );
  }

  if (error.statusCode === 429) {
    return "Resend rate limit reached (default is 2 requests/second) and retries were exhausted.";
  }

  if (error.statusCode === null) {
    return "Could not reach Resend at all — network failure or timeout.";
  }

  return "Resend rejected the message.";
}

// ----------------------------------------------------------------- mailer ---

function createResendMailer(apiKey: string, from: string): Mailer {
  const resend = new Resend(apiKey);

  return {
    async sendVerificationEmail(to, token) {
      const link = verificationUrl(token);
      const { html, text } = verificationBody(link);

      /**
       * Stable across retries of this send, unique per issued token.
       *
       * Without it, a retry after a timeout — where the request actually landed
       * but the response was lost — delivers a second copy. Derived from the
       * token's SHA-256 rather than the token itself so the raw credential is
       * never handed to a third party as metadata.
       */
      const idempotencyKey = `verify-${hashToken(token).slice(0, 32)}`;

      let lastError: SendError | null = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const { data, error } = await resend.emails.send(
          {
            from,
            to,
            subject: "Confirm your email — HomeMatch",
            html,
            text,
          },
          { idempotencyKey },
        );

        if (!error) {
          logger.info({ to, emailId: data?.id, attempt }, "Verification email sent");
          return;
        }

        lastError = error;

        if (!isRetryable(error)) break;

        if (attempt < MAX_ATTEMPTS) {
          const wait = backoffMs(attempt);
          logger.warn(
            { to, attempt, statusCode: error.statusCode, retryInMs: wait },
            "Verification email failed, retrying",
          );
          await delay(wait);
        }
      }

      // Never log `link` or `token` here: a verification link is a live,
      // single-use credential, and log files travel further than databases do.
      // The development-only wrapper below is the one deliberate exception.
      logger.error(
        {
          to,
          statusCode: lastError?.statusCode ?? null,
          providerMessage: lastError?.message,
          providerCode: lastError?.name,
        },
        describeFailure(lastError ?? { message: "", statusCode: null, name: "unknown" }),
      );
    },
  };
}

/**
 * Development only: log the link as well as sending it.
 *
 * This exists because setting a real API key otherwise makes local development
 * *worse*. With a key present the real adapter is selected, and signing up as
 * anything other than the Resend account owner gets a 403 — no email, and
 * previously no link either, so the verification flow became untestable with
 * any ordinary test address.
 *
 * Wrapping rather than branching means the link is logged whether the send
 * succeeded, was rejected, or timed out. Production never reaches this.
 */
function withDevLinkLogging(inner: Mailer): Mailer {
  return {
    async sendVerificationEmail(to, token) {
      logger.info(
        { to, link: verificationUrl(token) },
        "Verification link (development only — also attempting a real send)",
      );
      await inner.sendVerificationEmail(to, token);
    },
  };
}

/**
 * No API key at all: log the link instead of sending.
 *
 * The link is real and works — clicking it verifies the account exactly as the
 * emailed one would, so the flow is fully testable before anyone has a key.
 * `warn` rather than `info` so it cannot be mistaken for mail having been sent.
 * `env.ts` makes the Resend pair mandatory in production, so this is
 * unreachable there.
 */
function createLoggingMailer(): Mailer {
  return {
    async sendVerificationEmail(to, token) {
      logger.warn(
        { to, link: verificationUrl(token) },
        "No RESEND_API_KEY set — verification link logged instead of emailed",
      );
    },
  };
}

/** Tests assert against the database, not an inbox, and must never send mail. */
function createNoopMailer(): Mailer {
  return {
    async sendVerificationEmail() {
      /* intentionally does nothing */
    },
  };
}

export function resolveMailer(): Mailer {
  if (env.isTest) return createNoopMailer();

  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    const sender = createResendMailer(env.RESEND_API_KEY, env.MAIL_FROM);
    return env.isProduction ? sender : withDevLinkLogging(sender);
  }

  return createLoggingMailer();
}

export const mailer: Mailer = resolveMailer();


import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** Comma-separated. The public site's origin, plus the admin app's. */
  FRONTEND_ORIGIN: z.string().min(1, "FRONTEND_ORIGIN is required"),

  REFRESH_TTL_DAYS: z.coerce.number().int().positive().max(90).default(7),

  /**
   * HS256 signing key for access tokens. 32 bytes is the minimum that makes
   * sense for HMAC-SHA256 — a shorter key is silently accepted by the algorithm
   * and quietly weakens every token, so it is rejected here instead.
   *
   * Rotating this invalidates every live access token at once. There is no
   * `kid`/keyset mechanism yet; see the hardening backlog.
   */
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

  /**
   * How long an access token lives. This is the revocation window: logout and
   * bans kill the refresh chain immediately, but an already-issued access token
   * stays valid until it expires. Capped at an hour so the window cannot be
   * widened casually.
   */
  ACCESS_TTL_MINUTES: z.coerce.number().int().positive().max(60).default(15),

  /**
   * The single canonical origin used to build links in outbound email.
   *
   * Deliberately separate from FRONTEND_ORIGIN, which is a comma-separated
   * allowlist for CORS and therefore cannot be concatenated into a URL.
   */
  PUBLIC_APP_URL: z.string().url("PUBLIC_APP_URL must be a full URL"),

  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),

  /**
   * Password for the seeded admin account. Read from the environment because
   * "no secrets in code" is absolute, and an admin credential in git is the
   * worst kind. Only consumed by `prisma/seed.ts`.
   */
  ADMIN_SEED_EMAIL: z.string().optional(),
  ADMIN_SEED_PASSWORD: z.string().optional(),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  S3_ENDPOINT: z.string().min(1, "S3_ENDPOINT is required"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required"),
  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required"),
  /**
   * Path-style URLs (`endpoint/bucket/key`) rather than virtual-host style
   * (`bucket.endpoint/key`). Required for MinIO, which has no per-bucket DNS;
   * real S3 accepts either. A plain boolean coerce treats "false" as truthy, so
   * the value is matched explicitly.
   */
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
})
  /**
   * Mail config is required in production, optional elsewhere.
   *
   * Fail-fast is the rule, and in production it applies without exception: a
   * deploy that cannot send verification email is broken, and should refuse to
   * start rather than silently accept signups nobody can confirm.
   *
   * Development and test are deliberately different. Tests stub the mailer, and
   * a suite that sends real mail costs money and spams people. Development often
   * has no key yet — and blocking `npm run dev:backend` on a third-party API key
   * would make the whole backend unrunnable for a task unrelated to email. Both
   * fall back to a mailer that logs the link instead (see shared/mail/mailer.ts),
   * which is strictly more useful locally than a real send anyway.
   */
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "production") return;

    for (const key of ["RESEND_API_KEY", "MAIL_FROM"] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required in production — email verification cannot send without it`,
        });
      }
    }

    /**
     * `onboarding@resend.dev` is Resend's shared testing sender. It only
     * delivers to the Resend account owner's own address, so a production
     * deploy using it accepts signups and silently delivers nothing to any of
     * them — a failure that surfaces as confused users days later rather than
     * as an error.
     *
     * Refusing to boot is the cheaper discovery.
     */
    if (value.MAIL_FROM?.includes("resend.dev")) {
      ctx.addIssue({
        code: "custom",
        path: ["MAIL_FROM"],
        message:
          "MAIL_FROM uses the shared resend.dev testing sender, which only delivers to the Resend account owner. Verify a domain at resend.com/domains and use an address on it.",
      });
    }
  });

export type Env = z.infer<typeof envSchema> & {
  allowedOrigins: string[];
  isProduction: boolean;
  isTest: boolean;
  /** Refresh token lifetime, derived once so cookie maxAge and DB expiry agree. */
  sessionTtlMs: number;
  /** Access token lifetime, same reason. */
  accessTtlMs: number;
};

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const value = parsed.data;

  const allowedOrigins = value.FRONTEND_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.includes("*")) {
    throw new Error(
      "Invalid environment configuration: FRONTEND_ORIGIN cannot be '*'. The admin app sends a session cookie, and browsers reject credentialed requests to a wildcard origin. List each origin explicitly.",
    );
  }

  return {
    ...value,
    allowedOrigins,
    isProduction: value.NODE_ENV === "production",
    isTest: value.NODE_ENV === "test",
    sessionTtlMs: value.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
    accessTtlMs: value.ACCESS_TTL_MINUTES * 60 * 1000,
  };
}

export const env = loadEnv();

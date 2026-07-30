// Loaded here rather than in an entry point so every consumer — server, CLI
// scripts, tests — gets the same configuration without having to remember to
// import it. dotenv does not overwrite variables already set in the
// environment, so real deployment config (and .env.test, which the test setup
// loads first with override) still wins.
import "dotenv/config";
import { z } from "zod";

/**
 * The single place environment variables are read. Everything else imports
 * `env` from here, so there are no scattered `process.env` lookups and a
 * missing variable fails at startup rather than at the first request that
 * happens to need it.
 */

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** Comma-separated. The public site's origin, plus the admin app's. */
  FRONTEND_ORIGIN: z.string().min(1, "FRONTEND_ORIGIN is required"),

  /**
   * How long a signed-in browser stays signed in without activity. Sliding, not
   * absolute — every authenticated request pushes it out again.
   */
  SESSION_TTL_DAYS: z.coerce.number().int().positive().max(90).default(7),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  /**
   * Object storage for uploaded files (inspection photos, and generated PDFs
   * later). S3-compatible so the same client talks to MinIO in dev and AWS S3 /
   * Cloudflare R2 in production — only these values change. The test suite uses
   * an in-memory driver and never reads them.
   */
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
});

export type Env = z.infer<typeof envSchema> & {
  allowedOrigins: string[];
  isProduction: boolean;
  isTest: boolean;
  sessionTtlMs: number;
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

  // Credentialed CORS cannot use a wildcard: the browser refuses to send the
  // session cookie to an origin echoed back as `*`. Catching it here turns a
  // baffling client-side failure into a startup error naming the cause.
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
    sessionTtlMs: value.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

export const env = loadEnv();

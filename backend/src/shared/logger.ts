import pino from "pino";
import { env } from "./config/env";

const REDACTED_PATHS = [
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "req.headers.authorization",
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: REDACTED_PATHS, censor: "[Redacted]" },
  // Human-readable locally, JSON everywhere else — a log aggregator wants the
  // structure, and a developer wants to read it.
  transport: env.isProduction
    ? undefined
    : { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
});

/** Exported so a test can assert the redaction list rather than trust it. */
export const redactedPaths = REDACTED_PATHS;

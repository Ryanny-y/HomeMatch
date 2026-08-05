import { env } from "./shared/config/env";
import express, { type Express } from "express";
import pinoHttp from "pino-http";
import helmet from "helmet";
import { logger } from "./shared/logger";
import cookieParser from "cookie-parser";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { ok, fail } from "./shared/response/envelope";
import { ERROR_CODES } from "@homematch/shared";
import { adminRouter } from "./features/admin/admin.routes";
import { authRouter } from "./features/auth/auth.routes";
import { geocodingRouter } from "./features/geocoding/geocoding.routes";
import { catalogRouter } from "./features/listings/listings.catalog.routes";
import { listingsRouter } from "./features/listings/listings.routes";
import { profileRouter } from "./features/profile/profile.routes";
import { originCheck } from "./shared/middleware/originCheck";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler";

export function createApp(): Express {
  const app = express();

  if (env.isProduction) {
    // Behind an ALB. Needed for req.ip to be the real client rather than the
    // load balancer — rate limiting is keyed on it, and getting this wrong
    // means every request shares one bucket.
    app.set("trust proxy", 1);
  }

  /**
   * Security headers. Deliberately before anything that can respond, so even a
   * 404 or a rate-limit rejection carries them.
   *
   * CSP is disabled because this process serves only JSON — there is no
   * document for a content policy to govern, and the default policy would just
   * be noise on every response. The frontend sets its own.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  if (!env.isTest) {
    app.use(pinoHttp({ logger }));
  }

  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  // Second lock against CSRF, behind SameSite=Lax. See the middleware for why
  // one is not enough.
  app.use(originCheck);

  /**
   * Readiness, not just liveness.
   *
   * `SELECT 1` because a health check that only proves the process is running
   * will happily report healthy while the database is unreachable — and an ECS
   * target group would then route traffic to a task that can serve nothing.
   */
  app.get("/api/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json(ok({ status: "ok", database: "up" }));
    } catch (error) {
      logger.error({ err: error }, "Health check failed: database unreachable");
      res
        .status(503)
        .json(fail(ERROR_CODES.INTERNAL_ERROR, "Database unreachable"));
    }
  });

  app.use("/api/auth", authRouter);
  app.use("/api/catalog", catalogRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/geocode", geocodingRouter);
  app.use("/api/admin", adminRouter);

  // Order is load-bearing: unmatched routes 404, then every error — thrown or
  // rejected — funnels through the one handler. Both must come last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();

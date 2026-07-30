import { env } from "./shared/config/env";
import express, { type Express } from "express";
import pinoHttp from "pino-http";
import { logger } from "./shared/logger";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ok } from "./shared/response/envelope";

export function createApp(): Express {
  const app = express();

  if (env.isProduction) {
    app.set("trust proxy", 1);
  }

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

  app.get("/api/health", (_req, res) => {
    res.status(200).json(ok({ status: "ok" }));
  });


  return app;
}

export const app = createApp();

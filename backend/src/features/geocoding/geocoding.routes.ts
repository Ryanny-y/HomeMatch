import { Router } from "express";
import { geocodeQuerySchema } from "@homematch/shared";
import { geocodeLimiter } from "../../shared/middleware/rateLimit";
import { requireAuth, requireRole } from "../../shared/middleware/requireAuth";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./geocoding.controller";

export const geocodingRouter: Router = Router();

/**
 * Authenticated before it is rate limited, so the limiter can key on the user.
 * The gate is the same one listings uses: this endpoint costs money per call and
 * has no business answering anonymous traffic.
 */
geocodingRouter.get(
  "/",
  requireAuth,
  requireRole("landlord", "admin"),
  geocodeLimiter,
  validate({ query: geocodeQuerySchema }),
  controller.forward,
);

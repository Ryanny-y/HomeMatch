import { Router } from "express";
import {
  loginSchema,
  resendVerificationSchema,
  signupSchema,
  verifyEmailSchema,
} from "@homematch/shared";
import { requireAuth } from "../../shared/middleware/requireAuth";
import { validate } from "../../shared/middleware/validate";
import {
  loginLimiter,
  registerLimiter,
  resendLimiter,
  tokenLimiter,
} from "../../shared/middleware/rateLimit";
import * as controller from "./auth.controller";

export const authRouter: Router = Router();

authRouter.post(
  "/register",
  registerLimiter,
  validate({ body: signupSchema }),
  controller.register,
);

authRouter.post(
  "/login",
  loginLimiter,
  validate({ body: loginSchema }),
  controller.login,
);

/**
 * No `requireAuth` on either of these, deliberately.
 *
 * Refresh is what you call precisely *because* the access token is dead, so
 * requiring a live one would make it unreachable. Logout has to work with an
 * expired or absent session, or a stale cookie could never be cleared.
 */
authRouter.post("/refresh", controller.refresh);
authRouter.post("/logout", controller.logout);

authRouter.get("/me", requireAuth, controller.me);

authRouter.post(
  "/verify-email",
  tokenLimiter,
  validate({ body: verifyEmailSchema }),
  controller.verifyEmail,
);

authRouter.post(
  "/resend-verification",
  resendLimiter,
  validate({ body: resendVerificationSchema }),
  controller.resendVerification,
);

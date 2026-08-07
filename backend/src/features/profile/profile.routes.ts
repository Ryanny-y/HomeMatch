import { Router } from "express";
import { updateRenterPreferenceSchema } from "@homematch/shared";
import { requireAuth, requireRole } from "../../shared/middleware/requireAuth";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./profile.controller";

export const profileRouter: Router = Router();

/**
 * Renters only.
 *
 * A landlord or admin has no renter profile — they are not scored against
 * listings — so this is coarse gating answerable from the token alone, which
 * puts it in middleware and makes it a 403 rather than a 404.
 */
profileRouter.use(requireAuth, requireRole("renter"));

profileRouter.get("/", controller.getMine);

profileRouter.patch(
  "/",
  validate({ body: updateRenterPreferenceSchema }),
  controller.updateMine,
);

/**
 * No body, so no `validate`. The only input is who is calling, and `requireAuth`
 * above has already answered that.
 */
profileRouter.post("/onboarded", controller.markOnboarded);

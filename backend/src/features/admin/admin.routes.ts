import { Router } from "express";
import {
  adminListingQuerySchema,
  adminUserQuerySchema,
  updateUserRoleSchema,
  userIdParamSchema,
} from "@homematch/shared";
import { requireAuth, requireRole } from "../../shared/middleware/requireAuth";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./admin.controller";

export const adminRouter: Router = Router();

/**
 * One gate for the whole router. Nothing here is readable by a landlord, so the
 * check belongs once at the mount rather than repeated per route.
 *
 * Listing *mutations* are deliberately absent: `listings.service` already
 * returns any row to an admin, so publish, archive, edit and delete go through
 * `/api/listings/:id` as they always have. A second path to the same write is a
 * second place for the ownership rule to be got wrong.
 */
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/overview", controller.overview);

adminRouter.get(
  "/users",
  validate({ query: adminUserQuerySchema }),
  controller.listUsers,
);

adminRouter.patch(
  "/users/:id/role",
  validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
  controller.changeRole,
);

adminRouter.post(
  "/users/:id/resend-verification",
  validate({ params: userIdParamSchema }),
  controller.resendVerification,
);

adminRouter.post(
  "/users/:id/sign-out",
  validate({ params: userIdParamSchema }),
  controller.signOutEverywhere,
);

adminRouter.delete(
  "/users/:id",
  validate({ params: userIdParamSchema }),
  controller.removeUser,
);

adminRouter.get(
  "/listings",
  validate({ query: adminListingQuerySchema }),
  controller.listListings,
);

adminRouter.get("/listings/barangays", controller.listBarangays);

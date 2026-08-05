import { Router } from "express";
import { browseQuerySchema, listingSlugParamSchema } from "@homematch/shared";
import { requireAuth } from "../../shared/middleware/requireAuth";
import { catalogLimiter } from "../../shared/middleware/rateLimit";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./listings.catalog.controller";

/**
 * The catalog: published listings, readable by anyone with an account.
 *
 * `requireAuth` and nothing more. The gate is about *whether you are signed in*,
 * not which role you hold — a renter browsing, a landlord checking what they are
 * priced against, and an admin seeding all see the same rows, so a `requireRole`
 * here would invent a rule the product does not have.
 *
 * A second router rather than routes bolted onto `listingsRouter`, whose first
 * line gates everything after it to landlords and admins. Both are authenticated
 * now, but they answer different questions — "are you signed in" versus "do you
 * own listings" — and merging them would put a renter one reordered line away
 * from the owner-only endpoints.
 *
 * These handlers read published rows only; see `PUBLISHED` in the repository.
 */
export const catalogRouter: Router = Router();

catalogRouter.use(requireAuth, catalogLimiter);

catalogRouter.get("/listings", validate({ query: browseQuerySchema }), controller.browse);

catalogRouter.get(
  "/listings/:slug",
  validate({ params: listingSlugParamSchema }),
  controller.getBySlug,
);

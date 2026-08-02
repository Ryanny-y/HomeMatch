import { Router } from "express";
import {
  createListingSchema,
  listingIdParamSchema,
  listingImageConfirmSchema,
  listingImagePresignSchema,
  updateListingSchema,
} from "@homematch/shared";
import { z } from "zod";
import { requireAuth, requireRole } from "../../shared/middleware/requireAuth";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./listings.controller";

export const listingsRouter: Router = Router();

listingsRouter.use(requireAuth, requireRole("landlord", "admin"));

const imageParamsSchema = z.object({
  id: z.uuid(),
  imageId: z.uuid(),
});

listingsRouter.get("/mine", controller.listMine);

listingsRouter.post("/", validate({ body: createListingSchema }), controller.create);

listingsRouter.get(
  "/:id",
  validate({ params: listingIdParamSchema }),
  controller.getOne,
);

listingsRouter.patch(
  "/:id",
  validate({ params: listingIdParamSchema, body: updateListingSchema }),
  controller.update,
);

listingsRouter.delete(
  "/:id",
  validate({ params: listingIdParamSchema }),
  controller.remove,
);

listingsRouter.post(
  "/:id/publish",
  validate({ params: listingIdParamSchema }),
  controller.publish,
);

listingsRouter.post(
  "/:id/archive",
  validate({ params: listingIdParamSchema }),
  controller.archive,
);

listingsRouter.post(
  "/:id/images/presign",
  validate({ params: listingIdParamSchema, body: listingImagePresignSchema }),
  controller.presignImage,
);

listingsRouter.post(
  "/:id/images",
  validate({ params: listingIdParamSchema, body: listingImageConfirmSchema }),
  controller.confirmImage,
);

listingsRouter.delete(
  "/:id/images/:imageId",
  validate({ params: imageParamsSchema }),
  controller.removeImage,
);

listingsRouter.post(
  "/:id/images/:imageId/primary",
  validate({ params: imageParamsSchema }),
  controller.makeImagePrimary,
);

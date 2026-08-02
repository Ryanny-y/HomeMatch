import type { RequestHandler } from "express";
import type {
  CreateListingInput,
  ListingImageConfirmInput,
  ListingImagePresignInput,
  UpdateListingInput,
} from "@homematch/shared";
import { getAuth } from "../../shared/middleware/requireAuth";
import { ok } from "../../shared/response/envelope";
import * as service from "./listings.service";

type IdParams = { id: string };
type ImageParams = { id: string; imageId: string };

export const listMine: RequestHandler = async (req, res) => {
  res.status(200).json(ok({ listings: await service.listMine(getAuth(req)) }));
};

export const getOne: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  res.status(200).json(ok({ listing: await service.getOne(id, getAuth(req)) }));
};

export const create: RequestHandler = async (req, res) => {
  const listing = await service.create(req.body as CreateListingInput, getAuth(req));
  res.status(201).json(ok({ listing }));
};

export const update: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  const listing = await service.update(id, req.body as UpdateListingInput, getAuth(req));
  res.status(200).json(ok({ listing }));
};

export const publish: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  res.status(200).json(ok({ listing: await service.publish(id, getAuth(req)) }));
};

export const archive: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  res.status(200).json(ok({ listing: await service.archive(id, getAuth(req)) }));
};

export const remove: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  await service.remove(id, getAuth(req));
  res.status(200).json(ok(null));
};

export const presignImage: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  const { contentType } = req.body as ListingImagePresignInput;
  res.status(200).json(ok(await service.presignImage(id, contentType, getAuth(req))));
};

export const confirmImage: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  const { storageKey } = req.body as ListingImageConfirmInput;
  const listing = await service.confirmImage(id, storageKey, getAuth(req));
  res.status(201).json(ok({ listing }));
};

export const removeImage: RequestHandler = async (req, res) => {
  const { id, imageId } = req.params as ImageParams;
  const listing = await service.removeImage(id, imageId, getAuth(req));
  res.status(200).json(ok({ listing }));
};

export const makeImagePrimary: RequestHandler = async (req, res) => {
  const { id, imageId } = req.params as ImageParams;
  const listing = await service.makeImagePrimary(id, imageId, getAuth(req));
  res.status(200).json(ok({ listing }));
};

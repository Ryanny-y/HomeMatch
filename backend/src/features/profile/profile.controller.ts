import type { RequestHandler } from "express";
import type { UpdateRenterPreferenceInput } from "@homematch/shared";
import { getAuth } from "../../shared/middleware/requireAuth";
import { ok } from "../../shared/response/envelope";
import * as service from "./profile.service";

export const getMine: RequestHandler = async (req, res) => {
  res.status(200).json(ok({ preference: await service.getMine(getAuth(req)) }));
};

export const updateMine: RequestHandler = async (req, res) => {
  const preference = await service.updateMine(
    req.body as UpdateRenterPreferenceInput,
    getAuth(req),
  );
  res.status(200).json(ok({ preference }));
};

export const markOnboarded: RequestHandler = async (req, res) => {
  res.status(200).json(ok({ preference: await service.markOnboarded(getAuth(req)) }));
};

import type { RequestHandler } from "express";
import { ok } from "../../shared/response/envelope";
import * as service from "./geocoding.service";

export const forward: RequestHandler = async (req, res) => {
  const { q } = req.query as { q: string };
  res.json(ok({ result: await service.geocode(q) }));
};

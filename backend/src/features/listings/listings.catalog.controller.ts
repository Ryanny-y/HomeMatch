import type { RequestHandler } from "express";
import type { BrowseQuery } from "@homematch/shared";
import { ok, paginationMeta } from "../../shared/response/envelope";
import * as service from "./listings.service";

type SlugParams = { slug: string };

export const browse: RequestHandler = async (req, res) => {
  const query = req.query as unknown as BrowseQuery;
  const { listings, total } = await service.browsePublished(query);

  res
    .status(200)
    .json(ok({ listings }, paginationMeta(query.page, query.pageSize, total)));
};

export const getBySlug: RequestHandler = async (req, res) => {
  const { slug } = req.params as SlugParams;

  res.status(200).json(ok({ listing: await service.getPublishedBySlug(slug) }));
};

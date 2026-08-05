import type { RequestHandler } from "express";
import type {
  AdminListingQuery,
  AdminUserQuery,
  UpdateUserRoleInput,
} from "@homematch/shared";
import { getAuth } from "../../shared/middleware/requireAuth";
import { ok, paginationMeta } from "../../shared/response/envelope";
import * as service from "./admin.service";

type IdParams = { id: string };

export const overview: RequestHandler = async (_req, res) => {
  res.status(200).json(ok({ overview: await service.overview() }));
};

export const listUsers: RequestHandler = async (req, res) => {
  const query = req.query as unknown as AdminUserQuery;
  const { users, total } = await service.listUsers(query);

  res
    .status(200)
    .json(ok({ users }, paginationMeta(query.page, query.pageSize, total)));
};

export const changeRole: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;
  const { role } = req.body as UpdateUserRoleInput;

  res.status(200).json(ok({ user: await service.changeRole(id, role, getAuth(req)) }));
};

export const resendVerification: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;

  res.status(200).json(ok(await service.resendVerification(id, getAuth(req))));
};

export const signOutEverywhere: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;

  res.status(200).json(ok(await service.signOutEverywhere(id, getAuth(req))));
};

export const removeUser: RequestHandler = async (req, res) => {
  const { id } = req.params as IdParams;

  await service.removeUser(id, getAuth(req));
  res.status(200).json(ok(null));
};

export const listListings: RequestHandler = async (req, res) => {
  const query = req.query as unknown as AdminListingQuery;
  const { listings, total } = await service.listListings(query);

  res
    .status(200)
    .json(ok({ listings }, paginationMeta(query.page, query.pageSize, total)));
};

export const listBarangays: RequestHandler = async (_req, res) => {
  res.status(200).json(ok({ barangays: await service.listBarangays() }));
};

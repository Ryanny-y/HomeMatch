import type { Request, RequestHandler, Response } from "express";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResendVerificationInput,
  ResetPasswordPayload,
  SignupInput,
  VerifyEmailInput,
} from "@homematch/shared";
import { UnauthorizedError } from "../../shared/errors/AppError";
import { getAuth } from "../../shared/middleware/requireAuth";
import { ok } from "../../shared/response/envelope";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "./auth.cookies";
import * as service from "./auth.service";
import type { IssuedSession } from "./auth.types";


function respondWithSession(
  res: Response,
  session: IssuedSession,
  status: number,
): void {
  setAuthCookies(res, session);
  res.status(status).json(ok({ user: session.user }));
}

function refreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const register: RequestHandler = async (req, res) => {
  const session = await service.register(req.body as SignupInput);
  respondWithSession(res, session, 201);
};

export const login: RequestHandler = async (req, res) => {
  const session = await service.login(req.body as LoginInput);
  respondWithSession(res, session, 200);
};

export const refresh: RequestHandler = async (req, res) => {
  const token = refreshCookie(req);

  if (!token) {
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  const session = await service.refresh(token);
  respondWithSession(res, session, 200);
};

export const logout: RequestHandler = async (req, res) => {
  await service.logout(refreshCookie(req));
  clearAuthCookies(res);
  res.status(200).json(ok(null));
};

export const me: RequestHandler = async (req, res) => {
  const user = await service.getSession(getAuth(req).userId);
  res.status(200).json(ok({ user }));
};

export const verifyEmail: RequestHandler = async (req, res) => {
  await service.verifyEmail((req.body as VerifyEmailInput).token);
  res.status(200).json(ok(null));
};

export const forgotPassword: RequestHandler = async (req, res) => {
  await service.requestPasswordReset((req.body as ForgotPasswordInput).email);

  // Always 200 — see the service. Reporting failure here would leak whether the
  // address is registered.
  res.status(200).json(ok(null));
};

export const resetPassword: RequestHandler = async (req, res) => {
  const { token, password } = req.body as ResetPasswordPayload;
  await service.resetPassword(token, password);

  // Deliberately no session: the reset screen sends the user to log in, which
  // exercises the password they just set.
  res.status(200).json(ok(null));
};

export const resendVerification: RequestHandler = async (req, res) => {
  await service.resendVerification((req.body as ResendVerificationInput).email);

  // Always 200 — see the service. Reporting failure here would leak whether the
  // address exists.
  res.status(200).json(ok(null));
};

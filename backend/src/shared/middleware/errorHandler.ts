import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { ERROR_CODES } from "@homematch/shared";
import { AppError } from "../errors/AppError";
import { fail } from "../response/envelope";
import { logger } from "../logger";

/**
 * The one place an error becomes a response.
 *
 * Express 5 forwards rejected promises from async handlers here automatically,
 * which is why controllers carry no try/catch. Adding one would only reshape
 * what this already handles correctly.
 */

/** Anything that reaches here matched no route. */
export const notFoundHandler: RequestHandler = (req, res) => {
  res
    .status(404)
    .json(fail(ERROR_CODES.NOT_FOUND, `No route for ${req.method} ${req.path}`));
};

/**
 * Flattens a ZodError into the shape `frontend/src/lib/api.ts` already parses.
 *
 * `ApiError.fieldErrors` walks `details.issues`, joins each `path`, and renders
 * the message under the matching input. **Changing this shape silently breaks
 * field-level errors on every auth form** — they would fall back to a single
 * form-level message. It is a contract, not an implementation detail.
 */
function zodDetails(error: ZodError): { issues: unknown[] } {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
    })),
  };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Express requires the 4-arity signature to recognise this as an error
  // handler, so `_next` stays even though it is never called.
  void _next;

  if (res.headersSent) {
    // The response has already begun streaming; the only correct move is to
    // let Express destroy the socket rather than append a second body.
    logger.error({ err }, "Error thrown after response started");
    return;
  }

  if (err instanceof ZodError) {
    res
      .status(422)
      .json(
        fail(
          ERROR_CODES.VALIDATION_ERROR,
          "Some of that didn't look right.",
          zodDetails(err),
        ),
      );
    return;
  }

  if (err instanceof AppError) {
    // Expected. Log at warn without a stack — a 401 on login is not an
    // incident, and stacks for these bury the ones that matter.
    logger.warn(
      { code: err.code, status: err.status, path: req.path },
      err.message,
    );
    res.status(err.status).json(fail(err.code, err.message, err.details));
    return;
  }

  // Unexpected. Log everything, tell the client nothing — an unhandled error's
  // message can carry a query, a file path, or a value that must not leave the
  // process.
  logger.error({ err, path: req.path, method: req.method }, "Unhandled error");
  res
    .status(500)
    .json(
      fail(
        ERROR_CODES.INTERNAL_ERROR,
        "Something went wrong on our end. Please try again.",
      ),
    );
};

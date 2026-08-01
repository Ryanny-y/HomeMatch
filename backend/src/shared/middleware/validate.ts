import type { RequestHandler } from "express";
import type { ZodType } from "zod";

/**
 * Zod at the boundary, wired per-route — never `.parse()` inside a controller.
 *
 * The middleware replaces `req.body` / `req.params` / `req.query` with the
 * *parsed* values, so controllers receive coerced, trimmed, defaulted input and
 * services can trust what they are handed. A ZodError bubbles to the global
 * handler, which turns it into a 422 in the shape the frontend already parses.
 *
 * Route order is `auth → validate → controller`, so an unauthenticated caller
 * never learns which fields a payload wants.
 *
 * Express 5 note: `req.query` is a getter with no setter, so it cannot be
 * assigned like the other two. `Object.defineProperty` is the documented way
 * around it and is why query handling looks different here.
 */
type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }

      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, "query", {
          value: parsed,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

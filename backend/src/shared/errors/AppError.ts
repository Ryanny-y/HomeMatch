import { ERROR_CODES, type ErrorCode } from "@homematch/shared";

/**
 * Errors carry their own HTTP status and envelope code, so the global handler
 * never has to guess from an error message.
 *
 * `isOperational` marks the difference between "a caller did something we
 * anticipated" and "something broke". Operational errors surface their message
 * to the client verbatim; anything else is logged in full and answered with a
 * generic 500, because an unexpected error's message may contain a query, a
 * path, or a value that should never leave the process.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: unknown;
  readonly isOperational = true;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

/**
 * Not authenticated. Distinct from Forbidden: 401 means sign in, 403 means
 * signing in again will not help, and the client renders them differently.
 *
 * The default message is deliberately vague and is used for *every* login
 * failure — unknown email, wrong password. A message that distinguishes them
 * is an account-existence oracle.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Your email or password is incorrect.") {
    super(401, ERROR_CODES.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to this.") {
    super(403, ERROR_CODES.FORBIDDEN, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find that.") {
    super(404, ERROR_CODES.NOT_FOUND, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, ERROR_CODES.CONFLICT, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, ERROR_CODES.VALIDATION_ERROR, message, details);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many attempts. Try again in a few minutes.") {
    super(429, ERROR_CODES.RATE_LIMITED, message);
  }
}

/**
 * Our side failed, but in a way we anticipated and can describe safely — an
 * upstream provider timing out, or a key that was never configured.
 *
 * Operational on purpose. An unexpected throw still becomes a generic 500 with
 * its message withheld; this one exists so a caller can be told "address lookup
 * isn't configured, drag the pin instead" rather than "something went wrong".
 * Never construct it with a message containing a token, query, or path.
 */
export class InternalError extends AppError {
  constructor(message: string) {
    super(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}

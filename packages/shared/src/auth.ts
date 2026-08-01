import { z } from "zod";

/**
 * The auth contract. One definition, both sides of the wire.
 *
 * These schemas started life in `frontend/src/features/auth/schemas/` and moved
 * here when the API was built, so that the `validate` middleware on the backend
 * and the form on the frontend parse with the *same object* rather than two
 * copies that happen to agree today. A rule can no longer drift on one side.
 *
 * The messages are written in the interface's voice ("That doesn't look like an
 * email address.") and that is deliberate: a 422 from the API now reads exactly
 * like client-side validation, because it is the same string.
 *
 * Email validation is deliberately loose. Anything stricter starts rejecting
 * addresses that are genuinely deliverable, and the only real proof that an
 * address works is sending mail to it.
 */

export const PASSWORD_MIN_LENGTH = 10;

export const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "That doesn't look like an email address.");

export const newPasswordField = z
  .string()
  .min(1, "Choose a password.")
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .regex(/[a-zA-Z]/, "Include at least one letter and one number.")
  .regex(/[0-9]/, "Include at least one letter and one number.");

/**
 * What someone may sign themselves up as.
 *
 * `admin` is deliberately absent: it exists in `roleSchema` and in the database
 * enum, but it can only be granted by the seed script. A self-service signup
 * form must never be able to mint one.
 */
export const userRoleSchema = z.enum(["renter", "landlord"]);

/** Every role the system knows, including the one nobody can self-assign. */
export const roleSchema = z.enum(["renter", "landlord", "admin"]);

export const loginSchema = z.object({
  email: emailField,
  // Presence only. Strength rules belong where a password is *set*, not where
  // it is offered — applying them here would tell an attacker that an existing
  // password fails current policy, and would lock out users whose password
  // predates a rule change.
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .min(2, "Enter your full name."),
  email: emailField,
  password: newPasswordField,
  role: userRoleSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: newPasswordField,
    confirmation: z.string().min(1, "Re-enter your new password."),
  })
  .refine((values) => values.password === values.confirmation, {
    message: "Both passwords need to match.",
    path: ["confirmation"],
  });

/**
 * What actually goes over the wire when resetting a password.
 *
 * `resetPasswordSchema` above carries `confirmation` and a `.refine()` that the
 * two match — that is a form concern, and the second field never leaves the
 * browser. The API validates this shape instead, so the backend does not
 * require a field it has no use for and cannot check anything about.
 */
export const resetPasswordPayloadSchema = z.object({
  token: z.string().min(1),
  password: newPasswordField,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: emailField,
});

/**
 * The user payload every session-returning endpoint sends back.
 *
 * Never the password hash, never a token, never a raw persistence row. Defined
 * as a schema rather than a bare type so the frontend can validate the response
 * at its boundary instead of trusting the server's word for the shape.
 */
export const authenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  role: roleSchema,
  emailVerified: z.boolean(),
});

/** What `login`, `register`, `refresh` and `me` all return. */
export const sessionResponseSchema = z.object({
  user: authenticatedUserSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordPayload = z.infer<typeof resetPasswordPayloadSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type Role = z.infer<typeof roleSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/**
 * The auth schemas now live in `@homematch/shared` so the API validates with
 * the *same object* this form parses with, rather than a second copy that
 * agrees until someone edits one of them.
 *
 * This file stays as a re-export for two reasons: every form already imports
 * from here, and `frontend/CLAUDE.md` puts a feature's schemas under
 * `features/<feature>/schemas/` — so this is where a reader looks first. It is
 * a pointer, not a second source of truth. Add nothing to it: a rule written
 * here would be invisible to the backend, which is the exact failure this move
 * was made to prevent.
 *
 * Contract details: `packages/shared/src/auth.ts`.
 */

export {
  PASSWORD_MIN_LENGTH,
  emailField,
  newPasswordField,
  userRoleSchema,
  roleSchema,
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  authenticatedUserSchema,
  sessionResponseSchema,
} from "@homematch/shared";

export type {
  LoginInput,
  SignupInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
  UserRole,
  Role,
  AuthenticatedUser,
  SessionResponse,
} from "@homematch/shared";

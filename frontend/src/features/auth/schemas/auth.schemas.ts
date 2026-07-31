import { z } from "zod";

/**
 * The only validation authority for auth forms.
 *
 * These are a courtesy layer, not a security boundary — the API validates every
 * request with its own Zod schemas regardless. Their job is to answer faster
 * than a round trip and to phrase the problem in the interface's voice.
 *
 * Email is deliberately loose. Anything stricter starts rejecting addresses
 * that are genuinely deliverable, and the server is the real arbiter.
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

export const userRoleSchema = z.enum(["renter", "landlord"]);

export const loginSchema = z.object({
  email: emailField,
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

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: emailField,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;

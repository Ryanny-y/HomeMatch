/**
 * Public surface of the auth feature. Routes import from here; nothing outside
 * this feature reaches into `components/`, `api/`, `hooks/`, or `schemas/`.
 */
export { CostContrast } from "@/features/auth/components/CostContrast";
export { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
export { LoginForm } from "@/features/auth/components/LoginForm";
export { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
export { SignupForm } from "@/features/auth/components/SignupForm";
export { VerifyEmailClient } from "@/features/auth/components/VerifyEmailClient";

export { userRoleSchema, type UserRole } from "@/features/auth/schemas/auth.schemas";
export type { AuthenticatedUser } from "@/features/auth/types";

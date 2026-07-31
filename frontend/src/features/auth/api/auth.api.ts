import { apiPost } from "@/lib/api";
import type {
  ForgotPasswordInput,
  LoginInput,
  SignupInput,
} from "@/features/auth/schemas/auth.schemas";
import type { AuthenticatedUser } from "@/features/auth/types";

/**
 * The contract the backend has to satisfy, in one readable place rather than
 * scattered across five form components.
 *
 *   POST /api/auth/register             { email, password, fullName, role }
 *   POST /api/auth/login                { email, password }
 *   POST /api/auth/forgot-password      { email }
 *   POST /api/auth/reset-password       { token, password }
 *   POST /api/auth/verify-email         { token }
 *   POST /api/auth/resend-verification  { email }
 *
 * Each call throws `ApiError` on failure — see `lib/api.ts`. These become the
 * `mutationFn` bodies unchanged when TanStack Query is adopted.
 */
const ENDPOINTS = {
  register: "/api/auth/register",
  login: "/api/auth/login",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  verifyEmail: "/api/auth/verify-email",
  resendVerification: "/api/auth/resend-verification",
} as const satisfies Record<string, `/api/auth/${string}`>;

type SessionResponse = { user: AuthenticatedUser };

export function login(input: LoginInput): Promise<SessionResponse> {
  return apiPost<SessionResponse>(ENDPOINTS.login, input);
}

export function register(input: SignupInput): Promise<SessionResponse> {
  return apiPost<SessionResponse>(ENDPOINTS.register, input);
}

export function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<void> {
  return apiPost<void>(ENDPOINTS.forgotPassword, input);
}

export function resetPassword(input: {
  token: string;
  password: string;
}): Promise<void> {
  return apiPost<void>(ENDPOINTS.resetPassword, input);
}

export function verifyEmail(token: string): Promise<void> {
  return apiPost<void>(ENDPOINTS.verifyEmail, { token });
}

export function resendVerification(email: string): Promise<void> {
  return apiPost<void>(ENDPOINTS.resendVerification, { email });
}

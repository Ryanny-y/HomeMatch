import { apiGet, apiPost } from "@/lib/api";
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
 *   POST /api/auth/register             { email, password, fullName, role }  ✅
 *   POST /api/auth/login                { email, password }                  ✅
 *   POST /api/auth/logout               —                                    ✅
 *   POST /api/auth/refresh              — (cookie only)                      ✅
 *   GET  /api/auth/me                   —                                    ✅
 *   POST /api/auth/verify-email         { token }                            ✅
 *   POST /api/auth/resend-verification  { email }                            ✅
 *   POST /api/auth/forgot-password      { email }                            ❌ not built
 *   POST /api/auth/reset-password       { token, password }                  ❌ not built
 *
 * The last two are called by `ForgotPasswordForm` and `ResetPasswordForm` and
 * will 404 — a deliberate scope cut, not an oversight. Tracked in the vault
 * note `homematch-auth-hardening`.
 *
 * `refresh` is absent from this module on purpose: it is never called from
 * feature code. `lib/api.ts` invokes it automatically on a 401, behind a
 * single-flight guard — calling it from here would be a second, unguarded path
 * and could trip the server's reuse detection.
 *
 * Each call throws `ApiError` on failure — see `lib/api.ts`. These become the
 * `mutationFn` bodies unchanged when TanStack Query is adopted.
 */
const ENDPOINTS = {
  register: "/api/auth/register",
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  me: "/api/auth/me",
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

/**
 * Ends the session server-side and clears both cookies.
 *
 * Succeeds even with no valid session — a browser holding a stale cookie has to
 * be able to drop it. Callers should navigate afterwards and call
 * `router.refresh()` so server-rendered output for the old session is discarded.
 */
export function logout(): Promise<void> {
  return apiPost<void>(ENDPOINTS.logout, {});
}

/**
 * Who is signed in, according to the server.
 *
 * Throws `ApiError` with code `UNAUTHORIZED` when nobody is — callers should
 * treat that as "signed out", not as a failure worth surfacing.
 */
export function getSession(): Promise<SessionResponse> {
  return apiGet<SessionResponse>(ENDPOINTS.me);
}

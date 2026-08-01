import type { AuthenticatedUser } from "@homematch/shared";

export type IssuedSession = {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
};

/** The columns a session response needs — and deliberately nothing more. */
export const USER_DTO_SELECT = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  emailVerified: true,
} as const;

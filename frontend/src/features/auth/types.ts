import type { UserRole } from "@/features/auth/schemas/auth.schemas";

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole | "admin";
  emailVerified: boolean;
};

/** Field-keyed messages rendered under inputs. Keys match schema field names. */
export type FieldErrors = Record<string, string>;

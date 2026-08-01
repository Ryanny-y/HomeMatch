import { hash, verify } from "@node-rs/argon2";

const ARGON2ID = 2;

const ARGON2_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return verify(passwordHash, plain, ARGON2_OPTIONS).catch(() => false);
}

let decoy: Promise<string> | null = null;

export function decoyHash(): Promise<string> {
  decoy ??= hash(
    // Random per process, never stored, never compared against anything real.
    `decoy:${Math.random()}:${Date.now()}`,
    ARGON2_OPTIONS,
  );
  return decoy;
}

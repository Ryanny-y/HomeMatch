"use client";

import { PASSWORD_MIN_LENGTH } from "@/features/auth/schemas/auth.schemas";

/**
 * Feedback only — it never blocks submission. `newPasswordField` in the schema
 * decides what is acceptable; this just tells the user how far past the floor
 * they are.
 */
type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string };

const LABELS = ["Too short", "Weak", "Fair", "Strong", "Very strong"] as const;

function strengthOf(value: string): Strength {
  if (value.length === 0) return { score: 0, label: "" };

  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (value.length >= 14) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value)) score += 1;

  const clamped = Math.min(score, 4) as Strength["score"];
  return { score: clamped, label: LABELS[clamped] };
}

/**
 * One tone, not three.
 *
 * The meter used to run red → gold → blue, which put two hues into the middle
 * of the form that appear nowhere else on the screen and mean nothing the words
 * don't already say. How many bars are filled is the signal, and the label
 * beside them names it out loud — so the colour was redundant before it was
 * loud. It was also the weaker signal for anyone who cannot separate red from
 * gold at 4px tall.
 */
export function PasswordStrength({ password }: { password: string }) {
  const { score, label } = strengthOf(password);
  if (password.length === 0) return null;

  return (
    <div className="mt-2 flex items-center gap-3">
      <div aria-hidden="true" className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={`h-1 flex-1 rounded-full ${
              step <= score ? "bg-ink-soft" : "bg-line"
            }`}
          />
        ))}
      </div>
      <p
        aria-live="polite"
        className="font-mono text-[0.625rem] tracking-[0.08em] uppercase text-ink-muted"
      >
        {label}
      </p>
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  RenterPreferenceDto,
  RenterWant,
  UpdateRenterPreferenceInput,
} from "@homematch/shared";
import { updateRenterPreferenceSchema } from "@homematch/shared";
import { WANTS } from "@/features/profile/content";

/**
 * The editing state for the profile form.
 *
 * The draft is local and the save is explicit, so the server's copy never
 * round-trips back into an input someone is still typing in. Numbers stay
 * strings until save for the same reason a controlled number input cannot be
 * bound to a number: deleting the last digit would snap the old value back
 * under the cursor.
 */

export const FIELD_ORDER = ["budget", "householdSize", "wants", "otherNeeds"] as const;

export type FieldName = (typeof FIELD_ORDER)[number];

export type Draft = {
  budget: string;
  householdSize: string;
  wants: RenterWant[];
  otherNeeds: string;
};

export type FieldErrors = Partial<Record<FieldName, string>>;

function toDraft(preference: RenterPreferenceDto): Draft {
  return {
    budget: preference.budget === null ? "" : String(preference.budget),
    householdSize:
      preference.householdSize === null ? "" : String(preference.householdSize),
    wants: preference.wants,
    otherNeeds: preference.otherNeeds ?? "",
  };
}

/**
 * A number field's three states, kept apart.
 *
 * Empty is a legitimate answer meaning "clear this", and it must not be
 * confused with text that failed to parse — the first saves, the second is an
 * error the renter has to see.
 */
function parseNumber(raw: string): number | null | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : "invalid";
}

function sameWants(a: readonly RenterWant[], b: readonly RenterWant[]): boolean {
  return a.length === b.length && a.every((want, index) => want === b[index]);
}

function changedFields(draft: Draft, saved: Draft): FieldName[] {
  return FIELD_ORDER.filter((field) =>
    field === "wants"
      ? !sameWants(draft.wants, saved.wants)
      : draft[field] !== saved[field],
  );
}

/**
 * Validates the whole draft, returning one message per bad field.
 *
 * The rules come from `updateRenterPreferenceSchema` in the shared package, so
 * the message shown next to an input is the same string the API would answer
 * with — there is no second copy of a rule to drift.
 */
function validate(draft: Draft): FieldErrors {
  const errors: FieldErrors = {};

  const budget = parseNumber(draft.budget);
  const householdSize = parseNumber(draft.householdSize);

  if (budget === "invalid") errors.budget = "Enter an amount above zero.";
  if (householdSize === "invalid") {
    errors.householdSize = "Enter a number between 1 and 12.";
  }

  const result = updateRenterPreferenceSchema.safeParse({
    budget: budget === "invalid" ? undefined : budget,
    householdSize: householdSize === "invalid" ? undefined : householdSize,
    wants: draft.wants,
    otherNeeds: draft.otherNeeds.trim() === "" ? null : draft.otherNeeds,
  });

  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field as FieldName]) {
        errors[field as FieldName] = issue.message;
      }
    }
  }

  return errors;
}

function toPayload(draft: Draft, fields: readonly FieldName[]): UpdateRenterPreferenceInput {
  const payload: UpdateRenterPreferenceInput = {};

  for (const field of fields) {
    if (field === "budget") {
      const value = parseNumber(draft.budget);
      if (value !== "invalid") payload.budget = value;
    } else if (field === "householdSize") {
      const value = parseNumber(draft.householdSize);
      if (value !== "invalid") payload.householdSize = value;
    } else if (field === "wants") {
      payload.wants = draft.wants;
    } else {
      const trimmed = draft.otherNeeds.trim();
      payload.otherNeeds = trimmed === "" ? null : trimmed;
    }
  }

  return payload;
}

export type ProfileDraft = {
  draft: Draft;
  errors: FieldErrors;
  dirtyCount: number;
  isDirty: boolean;
  set: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
  toggleWant: (want: RenterWant) => void;
  /** Validates one field, for the blur pass. */
  validateField: (field: FieldName) => void;
  /**
   * Validates everything and returns only the changed fields, or null when
   * something is invalid. Sending just the changes is what the partial PATCH is
   * for, and it keeps a save small on mobile data.
   */
  prepare: () => UpdateRenterPreferenceInput | null;
  reset: () => void;
  /**
   * Adopts the server's copy after a save.
   *
   * Without this a saved profile can stay permanently dirty: the payload trims
   * text the draft still holds untrimmed, so `otherNeeds` typed with a trailing
   * space would never again compare equal to what came back.
   */
  syncTo: (preference: RenterPreferenceDto) => void;
};

export function useProfileDraft(preference: RenterPreferenceDto): ProfileDraft {
  const saved = useMemo(() => toDraft(preference), [preference]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [errors, setErrors] = useState<FieldErrors>({});

  const changed = changedFields(draft, saved);

  const set = useCallback(<K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    // Clearing on edit rather than re-validating per keystroke: telling someone
    // "enter a number above zero" while they are still typing the number is
    // noise, and the blur pass will say it if it is still true.
    setErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  const toggleWant = useCallback((want: RenterWant) => {
    setDraft((current) => {
      const next = new Set(current.wants);
      if (next.has(want)) next.delete(want);
      else next.add(want);

      // Rebuilt in display order so two identical selections are always the
      // same array, which is what makes the dirty check a plain comparison.
      return { ...current, wants: WANTS.map((w) => w.value).filter((w) => next.has(w)) };
    });
  }, []);

  const validateField = useCallback(
    (field: FieldName) => {
      setErrors((existing) => ({ ...existing, [field]: validate(draft)[field] }));
    },
    [draft],
  );

  const prepare = useCallback(() => {
    const found = validate(draft);

    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      return null;
    }

    setErrors({});
    return toPayload(draft, changedFields(draft, saved));
  }, [draft, saved]);

  const reset = useCallback(() => {
    setDraft(saved);
    setErrors({});
  }, [saved]);

  const syncTo = useCallback((next: RenterPreferenceDto) => {
    setDraft(toDraft(next));
    setErrors({});
  }, []);

  return {
    draft,
    errors,
    dirtyCount: changed.length,
    isDirty: changed.length > 0,
    set,
    toggleWant,
    validateField,
    prepare,
    reset,
    syncTo,
  };
}

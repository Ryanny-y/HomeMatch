"use client";

import { useCallback, useRef, useState } from "react";
import type { FormEvent, RefObject } from "react";
import type { ZodType } from "zod";

import { ApiError, toApiError } from "@/lib/api";
import type { FieldErrors } from "@/features/auth/types";

/**
 * Submit plumbing shared by every auth form: validate with the feature's Zod
 * schema, call the api layer, and turn a thrown `ApiError` into either field
 * errors or a form-level message.
 *
 * This exists so the five forms hold no validation branches of their own — the
 * schema is the only authority, and the rule "no manual validation when a Zod
 * schema exists" is enforced by there being nowhere else to put one. It is
 * shaped to be replaced by TanStack Form + `useMutation` without the callers
 * changing.
 */

type UseZodFormOptions<TInput, TResult> = {
  schema: ZodType<TInput>;
  /** Current form values, unvalidated. */
  values: unknown;
  submit: (input: TInput) => Promise<TResult>;
  onSuccess?: (result: TResult) => void;
  /**
   * Maps an error the server reports at form level onto a field, when that is
   * the only place the user can fix it — a duplicate email, for instance.
   */
  mapError?: (error: ApiError) => FieldErrors | undefined;
};

type UseZodFormResult = {
  errors: FieldErrors;
  formError: string | null;
  pending: boolean;
  formRef: RefObject<HTMLFormElement | null>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

/**
 * Moves focus to the first field that failed.
 *
 * Without this, submitting an invalid form scrolls nowhere and announces
 * nothing: the message appears off-viewport and the caret stays put. Focusing
 * the field both moves the viewport and lets the field's `aria-describedby`
 * error be read out.
 */
function focusFirstError(
  form: HTMLFormElement | null,
  errors: FieldErrors,
): void {
  const [firstField] = Object.keys(errors);
  if (!form || !firstField) return;

  const element = form.elements.namedItem(firstField);
  if (element instanceof HTMLElement) element.focus();
}

export function useZodForm<TInput, TResult>({
  schema,
  values,
  submit,
  onSuccess,
  mapError,
}: UseZodFormOptions<TInput, TResult>): UseZodFormResult {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fail = useCallback((found: FieldErrors) => {
    setErrors(found);
    focusFirstError(formRef.current, found);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const parsed = schema.safeParse(values);

      if (!parsed.success) {
        const found: FieldErrors = {};

        for (const issue of parsed.error.issues) {
          const key = issue.path.join(".");
          if (key && !found[key]) found[key] = issue.message;
        }

        fail(found);
        return;
      }

      setErrors({});
      setFormError(null);
      setPending(true);

      try {
        const result = await submit(parsed.data);
        onSuccess?.(result);
      } catch (thrown) {
        const error = toApiError(thrown);
        const mapped = mapError?.(error);
        const fields = mapped ?? error.fieldErrors;

        if (Object.keys(fields).length > 0) fail(fields);
        else setFormError(error.message);
      } finally {
        setPending(false);
      }
    },
    [schema, values, submit, onSuccess, mapError, fail],
  );

  return { errors, formError, pending, formRef, handleSubmit };
}

"use client";

import { useId, useState } from "react";
import { PiEye, PiEyeSlash } from "react-icons/pi";

/**
 * Form fields.
 *
 * Errors are wired through `aria-describedby` and `aria-invalid` rather than
 * relying on the red text being noticed, and the hint and error share the
 * describedby list so a field never loses its hint when it goes invalid.
 */

const inputClasses =
  "h-12 w-full rounded-chip border bg-surface px-3.5 text-[1rem] text-ink " +
  "placeholder:text-ink-faint transition-colors " +
  "focus:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15";

function borderFor(invalid: boolean): string {
  return invalid ? "border-danger" : "border-line-strong hover:border-ink-faint";
}

type BaseProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
};

function Describers({
  hint,
  error,
  hintId,
  errorId,
}: {
  hint?: string;
  error?: string;
  hintId: string;
  errorId: string;
}) {
  return (
    <>
      {hint && !error ? (
        <p id={hintId} className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-[0.8125rem] leading-snug text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[0.875rem] font-semibold text-ink">
      {children}
    </label>
  );
}

export function TextField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  type = "text",
  autoComplete,
  placeholder,
  required = true,
  inputMode,
}: BaseProps & {
  type?: "text" | "email";
  inputMode?: "email" | "text";
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        className={`mt-2 ${inputClasses} ${borderFor(Boolean(error))}`}
      />
      <Describers hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export function PasswordField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  required = true,
  children,
}: BaseProps & {
  /** Slot under the input — used for the strength meter on signup. */
  children?: React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          autoComplete={autoComplete}
          required={required}
          className={`${inputClasses} pr-12 ${borderFor(Boolean(error))}`}
        />
        <button
          type="button"
          onClick={() => setRevealed((shown) => !shown)}
          aria-pressed={revealed}
          className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-ink-muted transition-colors hover:text-brand"
        >
          {revealed ? (
            <PiEyeSlash aria-hidden="true" className="h-5 w-5" />
          ) : (
            <PiEye aria-hidden="true" className="h-5 w-5" />
          )}
          <span className="sr-only">
            {revealed ? "Hide password" : "Show password"}
          </span>
        </button>
      </div>
      {children}
      <Describers hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

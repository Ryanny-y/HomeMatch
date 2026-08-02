"use client";

import { useId, useState } from "react";
import { PiEye, PiEyeSlash } from "react-icons/pi";

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
  /**
   * For fields whose value is server state. A field that saves on every
   * keystroke fights the user: the server's copy round-trips back and
   * overwrites what they are still typing.
   */
  onBlur?: () => void;
  onFocus?: () => void;
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
  onBlur,
  onFocus,
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
        onBlur={onBlur}
        onFocus={onFocus}
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
  onBlur,
  onFocus,
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
          onBlur={onBlur}
          onFocus={onFocus}
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

/**
 * Money and counts.
 *
 * `inputMode="decimal"` gives a phone the numeric keypad without the spinner
 * arrows `type="number"` brings, which are a 20px tap target next to a 44px
 * field. Values stay strings until submit: a controlled number input clears
 * itself the moment someone deletes the last digit.
 */
export function NumberField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  placeholder,
  required = false,
  prefix,
  suffix,
  onBlur,
  onFocus,
}: BaseProps & { prefix?: string; suffix?: string }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative mt-2">
        {prefix ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-[0.9375rem] text-ink-muted"
          >
            {prefix}
          </span>
        ) : null}
        <input
          id={id}
          name={name}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          placeholder={placeholder}
          required={required}
          onBlur={onBlur}
          onFocus={onFocus}
          // Tabular numerals so a column of pesos aligns on the decimal.
          className={`${inputClasses} font-mono tabular-nums ${borderFor(Boolean(error))} ${
            prefix ? "pl-9" : ""
          } ${suffix ? "pr-14" : ""}`}
        />
        {suffix ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[0.8125rem] text-ink-muted"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      <Describers hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export function TextareaField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  placeholder,
  required = false,
  rows = 5,
  onBlur,
  onFocus,
}: BaseProps & { rows?: number }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        name={name}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        placeholder={placeholder}
        required={required}
        onBlur={onBlur}
        onFocus={onFocus}
        className={`mt-2 w-full rounded-chip border bg-surface px-3.5 py-3 text-[1rem] leading-[1.6] text-ink placeholder:text-ink-faint transition-colors focus:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15 ${borderFor(
          Boolean(error),
        )}`}
      />
      <Describers hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export function SelectField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  options,
  required = false,
  onBlur,
  onFocus,
}: BaseProps & { options: readonly { value: string; label: string }[] }) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        required={required}
        onBlur={onBlur}
        onFocus={onFocus}
        // Native select on purpose: it gets the platform picker on Android,
        // which is faster to operate one-handed than any custom listbox.
        className={`mt-2 ${inputClasses} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12"><path fill="%23475569" d="M2 4.5 6 8.5l4-4z"/></svg>')] bg-[length:12px] bg-[right_0.875rem_center] bg-no-repeat pr-10 ${borderFor(
          Boolean(error),
        )}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Describers hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

export function DateField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  required = false,
  onBlur,
  onFocus,
}: BaseProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input
        id={id}
        name={name}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        required={required}
        onBlur={onBlur}
        onFocus={onFocus}
        className={`mt-2 ${inputClasses} ${borderFor(Boolean(error))}`}
      />
      <Describers hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </div>
  );
}

/**
 * The whole row is the label, so the tap target is the row rather than a 16px
 * box — the difference between usable and not on a phone.
 */
export function CheckboxField({
  label,
  name,
  checked,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-start gap-3 rounded-chip border border-line bg-surface p-3.5 transition-colors hover:border-line-strong"
    >
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-describedby={hint ? hintId : undefined}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
      />
      <span>
        <span className="block text-[0.9375rem] font-semibold text-ink">{label}</span>
        {hint ? (
          <span id={hintId} className="mt-0.5 block text-[0.8125rem] text-ink-muted">
            {hint}
          </span>
        ) : null}
      </span>
    </label>
  );
}

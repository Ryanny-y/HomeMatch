import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "gold" | "onDark";
type Size = "md" | "lg";

/**
 * The press is deliberately shorter than the hover: 120ms down against 200ms
 * for colour. A button that takes as long to acknowledge a click as it does to
 * warm up on hover reads as laggy, so the feedback is the fastest thing on the
 * page. It is `motion-safe` because it is movement, however small.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-chip font-semibold " +
  "tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 " +
  "motion-safe:active:translate-y-px motion-safe:active:duration-[var(--dur-feedback)] " +
  "disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 " +
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-55 aria-disabled:active:translate-y-0";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-[0_1px_2px_rgb(37_99_235/0.35)] hover:bg-brand-dark",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-brand hover:text-brand",
  gold: "bg-gold text-ink hover:bg-gold-ink hover:text-white",
  onDark: "bg-white text-brand-deep hover:bg-gold hover:text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

function classesFor(variant: Variant, size: Size, className?: string): string {
  return [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classesFor(variant, size, className)}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={classesFor(variant, size, className)} {...props} />;
}

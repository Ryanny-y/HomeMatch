import type { ReactNode } from "react";
import type { IconType } from "react-icons";

/**
 * The card is the page's structural unit. Two knobs only — `tone` and whether
 * it lifts on hover — so a page of cards reads as one system instead of a
 * dozen slightly different boxes.
 */

type CardTone = "plain" | "brand" | "gold" | "sunken";

const tones: Record<CardTone, string> = {
  plain: "border-line bg-surface",
  brand: "border-brand-line bg-brand-soft",
  gold: "border-gold-line bg-gold-soft",
  sunken: "border-line bg-surface-sunken",
};

export function Card({
  children,
  tone = "plain",
  hover = false,
  className,
}: {
  children: ReactNode;
  tone?: CardTone;
  /** Adds the lift interaction. Only for cards that are themselves a link. */
  hover?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border shadow-card ${tones[tone]} ${
        hover ? "lift" : ""
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

/**
 * A tinted square holding a single icon. Colour is passed as utility classes so
 * a feature card can carry its category hue without a new component per colour.
 */
export function IconBadge({
  icon: Icon,
  className,
  size = "md",
}: {
  icon: IconType;
  /** Expected to set both a background and a text colour. */
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const glyph = size === "sm" ? "h-[1.125rem] w-[1.125rem]" : "h-5 w-5";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-chip ${className ?? ""}`}
    >
      <Icon className={glyph} />
    </span>
  );
}

/** Small pill for statuses and metadata — "Free during launch", "Live now". */
export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.6875rem] font-medium tracking-[0.04em] uppercase ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

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
 * A neutral square holding a single icon.
 *
 * The tone is a closed set, not a colour you pass in. It used to take a
 * free-form `className` "expected to set both a background and a text colour",
 * and that is exactly how nineteen raw Tailwind hues got onto a page whose six
 * cost colours are supposed to mean something — `bg-violet-50` on a feature
 * card is one letter away from the violet that means "parking", and Tailwind 4's
 * `violet-600` is not even the same value as `--color-cat-parking`.
 *
 * So the badge is neutral everywhere. Colour on this page belongs to the four
 * roles listed in `globals.css`, and an icon on a marketing card is none of
 * them. What differentiates these cards is the icon's shape, which is what an
 * icon is for.
 *
 * The tone names the surface the badge sits *on*, so it can invert against it:
 * a sunken chip on a white card, a white chip on a sunken card. Either way the
 * fill is only ~1.1:1 against its card, so the hairline is what makes the
 * square read — it is load-bearing, not trim.
 */
type BadgeTone = "onSurface" | "onSunken" | "onDark";

const badgeTones: Record<BadgeTone, string> = {
  onSurface: "border-line bg-surface-sunken text-ink-soft",
  onSunken: "border-line bg-surface text-ink-soft",
  onDark: "border-white/15 bg-white/10 text-white",
};

export function IconBadge({
  icon: Icon,
  tone = "onSurface",
  className,
  size = "md",
}: {
  icon: IconType;
  /** Which surface the badge sits on — it inverts against it. */
  tone?: BadgeTone;
  /** Layout only. Colour comes from `tone`. */
  className?: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const glyph = size === "sm" ? "h-[1.125rem] w-[1.125rem]" : "h-5 w-5";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex ${box} shrink-0 items-center justify-center rounded-chip border ${badgeTones[tone]} ${className ?? ""}`}
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

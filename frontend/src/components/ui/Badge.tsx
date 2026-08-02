import type { ReactNode } from "react";

/**
 * Status, carried by shape and word as well as colour.
 *
 * The dot is not decoration — it gives each tone a second, non-colour signal so
 * status survives a colourblind reader and a greyscale print. The label always
 * says the state in words for the same reason.
 *
 * Tones deliberately avoid the six `--color-cat-*` hues: under the colour
 * contract those mean cost lines and nothing else.
 */
type BadgeTone = "neutral" | "live" | "blocked" | "ready";

const tones: Record<BadgeTone, { chip: string; dot: string }> = {
  neutral: { chip: "border-line bg-surface-sunken text-ink-muted", dot: "bg-ink-faint" },
  ready: { chip: "border-brand-line bg-brand-soft text-brand-dark", dot: "bg-brand" },
  live: { chip: "border-live-line bg-live-soft text-live-ink", dot: "bg-live" },
  blocked: { chip: "border-gold-line bg-gold-soft text-gold-ink", dot: "bg-gold" },
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const style = tones[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-[0.75rem] font-semibold ${style.chip}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {children}
    </span>
  );
}

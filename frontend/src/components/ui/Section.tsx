import type { ReactNode } from "react";
import type { IconType } from "react-icons";

/**
 * Page furniture. Every landing section is a <section> with an id (so the nav
 * can anchor to it) and an accessible name from its own heading.
 *
 * Vertical rhythm lives here alone — sections never set their own padding,
 * which is how competing rules end up cancelling each other out.
 */

type Tone = "canvas" | "surface" | "deep";

const tones: Record<Tone, string> = {
  canvas: "bg-canvas text-ink",
  surface: "bg-surface text-ink",
  deep: "bg-brand-deep text-white",
};

export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function Section({
  id,
  tone = "canvas",
  className,
  children,
  labelledBy,
}: {
  id: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`scroll-mt-20 py-20 sm:py-24 ${tones[tone]} ${className ?? ""}`}
    >
      <Container>{children}</Container>
    </section>
  );
}

/** Eyebrow: an icon chip plus a short label, sitting above every section head. */
export function Eyebrow({
  icon: Icon,
  children,
  onDark = false,
}: {
  icon: IconType;
  children: ReactNode;
  onDark?: boolean;
}) {
  return (
    <p
      className={`inline-flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-2 font-mono text-[0.6875rem] font-medium tracking-[0.08em] uppercase ${
        onDark
          ? "border-white/20 bg-white/10 text-white"
          : "border-brand-line bg-brand-soft text-brand-dark"
      }`}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {children}
    </p>
  );
}

export function SectionHeading({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={`mt-5 max-w-3xl text-[clamp(1.875rem,3.6vw,2.875rem)] ${className ?? ""}`}
    >
      {children}
    </h2>
  );
}

export function Lede({
  children,
  onDark = false,
  className,
}: {
  children: ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`mt-4 max-w-2xl text-lg leading-[1.6] ${
        onDark ? "text-white/75" : "text-ink-muted"
      } ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

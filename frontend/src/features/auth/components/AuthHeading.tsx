import type { ReactNode } from "react";
import type { IconType } from "react-icons";

import { IconBadge } from "@/components/ui/Card";

export function AuthHeading({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon?: IconType;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      {icon ? (
        <IconBadge icon={icon} className="mb-4 bg-surface-sunken text-ink-soft" />
      ) : null}

      {/* Neutral rather than brand-dark. The eyebrow orients you; it is not a
          thing to act on, and colouring it put an accent above every heading in
          the flow competing with the one control that matters. */}
      <p className="font-mono text-[0.625rem] font-medium tracking-[0.1em] uppercase text-ink-muted">
        {eyebrow}
      </p>
      <h1 className="mt-2.5 text-[clamp(1.75rem,3.6vw,2.25rem)] leading-[1.1]">
        {title}
      </h1>
      {children ? (
        <p className="mt-4 leading-[1.6] text-ink-muted">{children}</p>
      ) : null}
    </div>
  );
}

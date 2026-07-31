import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import {
  PiCheckCircleFill,
  PiInfoFill,
  PiWarningCircleFill,
} from "react-icons/pi";

type AlertTone = "error" | "success" | "info";

const tones: Record<AlertTone, { box: string; icon: IconType; glyph: string; label: string }> = {
  error: {
    box: "border-danger-line bg-danger-soft",
    icon: PiWarningCircleFill,
    glyph: "text-danger",
    label: "Problem",
  },
  success: {
    box: "border-brand-line bg-brand-soft",
    icon: PiCheckCircleFill,
    glyph: "text-brand",
    label: "Done",
  },
  info: {
    box: "border-line bg-surface-sunken",
    icon: PiInfoFill,
    glyph: "text-ink-muted",
    label: "Note",
  },
};

/**
 * Form-level messages. Errors announce themselves — a submit failure that only
 * appears visually is invisible to anyone using a screen reader, since focus
 * has not moved.
 */
export function Alert({
  tone = "error",
  title,
  children,
}: {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
}) {
  const { box, icon: Icon, glyph, label } = tones[tone];

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-3 rounded-chip border px-4 py-3.5 text-[0.9375rem] leading-relaxed text-ink ${box}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 h-[1.125rem] w-[1.125rem] shrink-0 ${glyph}`} />
      <div>
        <p className="font-mono text-[0.625rem] font-medium tracking-[0.08em] uppercase text-ink-muted">
          {title ?? label}
        </p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}

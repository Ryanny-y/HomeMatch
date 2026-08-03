import type { ReactNode } from "react";

/**
 * A control paired with what that control does to a score.
 *
 * The consequence is a column at `lg` and a line underneath below it — never a
 * tooltip. It is the argument of the whole page, and this product's default
 * device is a phone, where a hover target does not exist.
 *
 * `id` is wired back to the input through `describedBy`, so the explanation is
 * announced with the control instead of being read as loose text beside it.
 */
export function RubricRow({
  id,
  consequence,
  children,
}: {
  id: string;
  consequence: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-x-8 gap-y-2 lg:grid-cols-12">
      <div className="lg:col-span-7">{children}</div>

      <p
        id={id}
        className="text-[0.875rem] leading-[1.6] text-ink-muted lg:col-span-5 lg:pt-8"
      >
        {consequence}
      </p>
    </div>
  );
}

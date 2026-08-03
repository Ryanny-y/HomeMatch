"use client";

import type { RenterWant } from "@homematch/shared";
import { CheckboxField } from "@/components/ui/Field";
import { WANTS } from "@/features/profile/content";

/**
 * The nine wants.
 *
 * A real `fieldset` so the group's own explanation is announced before the
 * first checkbox rather than after someone has already ticked one. The legend
 * is visually hidden because `RubricGroup` already prints the heading — hiding
 * it avoids saying the same word twice on screen while keeping it in the
 * accessibility tree.
 */
export function WantsGrid({
  selected,
  onToggle,
}: {
  selected: readonly RenterWant[];
  onToggle: (want: RenterWant) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">What you want in a place</legend>

      <div className="grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {WANTS.map((want) => (
          <CheckboxField
            key={want.value}
            name={`want-${want.value}`}
            label={want.label}
            hint={want.hint}
            checked={selected.includes(want.value)}
            onChange={() => onToggle(want.value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

"use client";

import { PiCheckCircleFill } from "react-icons/pi";
import { Button } from "@/components/ui/Button";

/**
 * The unsaved-work bar, shared by the profile and the listing editor.
 *
 * Absent when nothing is owed rather than present-and-disabled: a permanent bar
 * over the content is a permanent claim on the reader's attention for a state
 * where there is nothing to do. It arrives when the first edit is made, and the
 * confirmation replaces it in place so the eye does not have to move to learn
 * the save worked.
 *
 * The two labels are props because the confirmation has to name what was saved
 * — "Saved." alone reads as a system message rather than an answer to the thing
 * the person just did.
 */
export function SaveBar({
  dirtyCount,
  invalidCount,
  saving,
  saved,
  saveLabel,
  savedLabel,
  onSave,
  onDiscard,
}: {
  dirtyCount: number;
  invalidCount: number;
  saving: boolean;
  saved: boolean;
  /** The button's text, e.g. "Save profile". */
  saveLabel: string;
  /** The confirmation, e.g. "Profile saved." */
  savedLabel: string;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (saved) {
    return (
      <Bar>
        <p
          role="status"
          className="flex items-center gap-2 text-[0.9375rem] font-semibold text-live-ink"
        >
          <PiCheckCircleFill aria-hidden="true" className="h-[1.125rem] w-[1.125rem]" />
          {savedLabel}
        </p>
      </Bar>
    );
  }

  if (dirtyCount === 0) return null;

  const status =
    invalidCount > 0
      ? `${invalidCount} ${invalidCount === 1 ? "field needs" : "fields need"} attention`
      : `${dirtyCount} unsaved ${dirtyCount === 1 ? "change" : "changes"}`;

  return (
    <Bar>
      <p
        className={`text-[0.9375rem] ${invalidCount > 0 ? "font-semibold text-danger" : "text-ink-muted"}`}
      >
        {status}
      </p>

      <div className="flex items-center gap-3 max-sm:w-full">
        <Button
          variant="secondary"
          onClick={onDiscard}
          disabled={saving}
          className="max-sm:flex-1"
        >
          Discard
        </Button>
        <Button onClick={onSave} disabled={saving} className="max-sm:flex-1">
          {saving ? "Saving…" : saveLabel}
        </Button>
      </div>
    </Bar>
  );
}

/**
 * `position: sticky` at the bottom of the scroll container rather than `fixed`:
 * a fixed bar sits over whatever is beneath it, and on a phone that is the
 * field being edited. The page reserves the height below it instead.
 */
function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bar-in sticky bottom-0 z-40 -mx-4 mt-8 border-t border-line bg-canvas/90 px-4 py-3.5 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}

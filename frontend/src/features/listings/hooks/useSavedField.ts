"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A text input whose saved value lives on the server, but whose *typing* does
 * not.
 *
 * Binding an input directly to server state and saving on every keystroke looks
 * fine and breaks in two ways that are hard to diagnose from the symptom:
 *
 *  - The description field could not accept a space. `updateListingSchema`
 *    trims, so each keystroke round-tripped a trimmed string back into the
 *    input and deleted the trailing space as it was typed.
 *  - Deposit and advance could not be cleared. An empty field parsed to null,
 *    fell back to the previous number, and snapped back under the cursor.
 *
 * Both disappear once the draft is local and the save happens on blur. It also
 * turns one PATCH per keystroke into one per edit, which matters on the mobile
 * connection this product assumes.
 *
 * The server value still wins while the field is idle, so a save elsewhere — or
 * a refetch — lands normally; it just cannot overwrite someone mid-sentence.
 *
 * `commit` returns whether it accepted the value. Rejecting restores what was
 * saved, which is how a required field survives being cleared on the way to
 * typing a different number.
 */
export type SavedFieldBinding = {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
};

export function useSavedField(
  serverValue: string,
  commit: (value: string) => boolean,
): SavedFieldBinding {
  const [draft, setDraft] = useState(serverValue);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(serverValue);
  }, [serverValue]);

  return {
    value: draft,
    onChange: setDraft,
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;

      // Unchanged fields must not PATCH: tabbing through the form would
      // otherwise write every field it passed through.
      if (draft === serverValue) return;

      if (!commit(draft)) setDraft(serverValue);
    },
  };
}

/**
 * The numeric variant.
 *
 * `allowEmpty` separates a field that may legitimately hold nothing from one
 * that must hold a number. Clearing a required field is a normal step on the
 * way to typing a different one, so it is allowed while focused and restored on
 * blur rather than blocked keystroke by keystroke.
 */
export function useSavedNumberField(
  serverValue: number | null,
  commit: (value: number | null) => void,
  allowEmpty = true,
): SavedFieldBinding {
  return useSavedField(serverValue === null ? "" : String(serverValue), (next) => {
    const trimmed = next.trim();

    if (trimmed === "") {
      if (!allowEmpty) return false;
      commit(null);
      return true;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return false;

    commit(parsed);
    return true;
  });
}

"use client";

import { useState } from "react";
import { PiPlus, PiX } from "react-icons/pi";
import { MAX_PREFERRED_BARANGAYS } from "@homematch/shared";
import { TextField } from "@/components/ui/Field";

/**
 * Where the renter will live.
 *
 * The odd card out on this page: everything else here is *scored*, and this is
 * *filtered* on — the saved areas become the catalog's opening filter. The
 * consequence line says so, because a field that quietly decides what you are
 * shown is a different promise from one that reorders it.
 *
 * It does not replace the location wants people already write into "anything
 * else". "Near UP Diliman" is richer than any list and stays there; this is the
 * part a database can act on.
 */
export function LocationCard({
  city,
  barangays,
  cityError,
  barangaysError,
  onCityChange,
  onCityBlur,
  onAdd,
  onRemove,
}: {
  city: string;
  barangays: readonly string[];
  cityError?: string;
  barangaysError?: string;
  onCityChange: (value: string) => void;
  onCityBlur: () => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [pending, setPending] = useState("");

  const full = barangays.length >= MAX_PREFERRED_BARANGAYS;
  const canAdd = pending.trim() !== "" && !full;

  function commit(): void {
    if (!canAdd) return;
    onAdd(pending);
    setPending("");
  }

  return (
    <div className="space-y-5">
      <div data-field="preferredCity">
        <TextField
          label="City"
          name="preferredCity"
          value={city}
          onChange={onCityChange}
          onBlur={onCityBlur}
          error={cityError}
          placeholder="Quezon City"
          required={false}
          hint="Leave it blank to see everywhere we cover."
        />
      </div>

      <div data-field="preferredBarangays">
        {/*
         * Enter is caught here rather than on the input because `TextField`
         * takes no key handler, and React's synthetic events bubble. Without
         * it, Enter would submit the surrounding profile form — so typing an
         * area and pressing the obvious key would save the page instead of
         * adding the area.
         */}
        <div
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            commit();
          }}
        >
          <TextField
            label="Areas you'd live in"
            name="preferredBarangay"
            value={pending}
            onChange={setPending}
            error={barangaysError}
            placeholder="Diliman"
            required={false}
            hint={
              full
                ? `That's ${MAX_PREFERRED_BARANGAYS} areas — remove one to add another.`
                : "Add up to 10 barangays. Press Enter after each one."
            }
          />
        </div>

        <button
          type="button"
          onClick={commit}
          disabled={!canAdd}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-chip border border-line-strong bg-surface px-4 font-semibold text-ink transition-colors duration-(--dur-state) ease-(--ease-state) hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-50"
        >
          <PiPlus aria-hidden size={16} />
          Add area
        </button>

        {barangays.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {barangays.map((area) => (
              <li key={area}>
                <button
                  type="button"
                  onClick={() => onRemove(area)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-chip bg-surface-sunken py-1 pr-2 pl-3.5 text-[0.875rem] font-semibold text-ink transition-colors duration-(--dur-state) ease-(--ease-state) hover:bg-danger/10 hover:text-danger"
                >
                  {area}
                  <PiX aria-hidden size={14} />
                  <span className="sr-only">Remove</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

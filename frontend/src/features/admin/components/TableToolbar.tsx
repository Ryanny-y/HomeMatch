"use client";

import { useEffect, useId, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

export type FilterOption = { readonly value: string; readonly label: string };

export type Facet = {
  name: string;
  label: string;
  value: string;
  options: readonly FilterOption[];
};

/**
 * Search and faceted filters over a table.
 *
 * The search debounces into the URL rather than firing per keystroke: every
 * change is a `router.replace` and a refetch, and typing "katipunan" should be
 * one query, not nine.
 */
export function TableToolbar({
  searchLabel,
  searchValue,
  facets,
  onSearch,
  onFacet,
  onClear,
}: {
  searchLabel: string;
  searchValue: string;
  facets: Facet[];
  onSearch: (value: string) => void;
  onFacet: (name: string, value: string) => void;
  onClear: () => void;
}) {
  const searchId = useId();
  const [draft, setDraft] = useState(searchValue);
  const [syncedWith, setSyncedWith] = useState(searchValue);

  /**
   * Resets when the URL changes underneath — a back button, or the Clear
   * button — so the box never shows a term that is no longer filtering.
   *
   * Adjusted during render rather than in an effect. React re-runs this
   * component immediately with the new state and renders nothing in between, so
   * there is no flash of the stale term and no second commit; an effect would
   * paint the old value first and then correct it. A `key` reset is the other
   * documented option, but remounting the input would drop focus mid-typing.
   */
  if (searchValue !== syncedWith) {
    setSyncedWith(searchValue);
    setDraft(searchValue);
  }

  useEffect(() => {
    if (draft === searchValue) return;

    const timer = setTimeout(() => onSearch(draft), 300);

    return () => clearTimeout(timer);
  }, [draft, searchValue, onSearch]);

  const filtering = searchValue !== "" || facets.some((facet) => facet.value !== "");

  return (
    <div className="flex flex-wrap items-end gap-3 pb-4">
      <div className="min-w-56 flex-1">
        <label htmlFor={searchId} className="sr-only">
          {searchLabel}
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
          />
          <Input
            id={searchId}
            type="search"
            value={draft}
            placeholder={searchLabel}
            onChange={(event) => setDraft(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {facets.map((facet) => (
        <div key={facet.name}>
          <label htmlFor={`facet-${facet.name}`} className="sr-only">
            {facet.label}
          </label>
          <Select
            value={facet.value}
            onValueChange={(value) => onFacet(facet.name, value)}
          >
            <SelectTrigger id={`facet-${facet.name}`} className="w-40">
              <SelectValue placeholder={facet.label} />
            </SelectTrigger>
            <SelectContent>
              {facet.options.map((option) => (
                // Radix reserves "" for the cleared state, so the "any" option
                // carries a sentinel the screen maps back to an absent filter.
                <SelectItem key={option.value} value={option.value || "any"}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {filtering ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X aria-hidden />
          Clear
        </Button>
      ) : null}
    </div>
  );
}

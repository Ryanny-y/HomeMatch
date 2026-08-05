"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filters, sorting and paging live in the URL.
 *
 * Not in React state: a filtered table is a place, and a place should survive a
 * reload, a back button, and being pasted into a message. It also means the
 * server component and the client screen read the same values from one source
 * rather than agreeing by convention.
 */
export type ParamPatch = Record<string, string | number | undefined>;

export function useTableQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (patch: ParamPatch) => {
      const next = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }

      /**
       * Any change other than paging returns to page one.
       *
       * Narrowing a filter while on page 4 otherwise lands on an empty table
       * that looks like "no results" when the results are simply on page 1.
       */
      if (!("page" in patch)) next.delete("page");

      const query = next.toString();

      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /** Flips direction when re-sorting the active column, else defaults to desc. */
  const toggleSort = useCallback(
    (column: string, activeColumn: string, activeDirection: string) => {
      setParams({
        sort: column,
        direction:
          column === activeColumn && activeDirection === "desc" ? "asc" : "desc",
      });
    },
    [setParams],
  );

  return { searchParams, setParams, toggleSort };
}

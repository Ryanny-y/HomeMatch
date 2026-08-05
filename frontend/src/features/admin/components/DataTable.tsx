"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/table";
import { Skeleton } from "@/components/shadcn/skeleton";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  /**
   * The sort direction a column is currently showing, for `aria-sort`.
   *
   * Carried on `meta` rather than in the table's own sorting state because the
   * sort lives in the URL and the server applies it — the table is told the
   * answer, so this is presentation, not state.
   */
  // The generics are unused here but must match the interface being augmented.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    sorted?: "asc" | "desc";
  }
}

/**
 * One table shell, two screens.
 *
 * Filtering, sorting and paging are all server-authoritative — the server owns
 * which rows exist and in what order, so the table is told, never asked. That is
 * why there is no `getSortedRowModel` or `getFilteredRowModel` here: adding one
 * would give the client a second opinion about a question the API already
 * answered, and the two would disagree the moment a page boundary was crossed.
 *
 * `useReactTable` raises a standing `react-hooks/incompatible-library` warning:
 * it returns fresh functions each render, so React Compiler declines to memoize
 * this component. Left visible rather than silenced — it is accurate, and the
 * cost is one un-memoized table of at most `pageSize` rows.
 */
export function DataTable<T>({
  columns,
  rows,
  label,
  loading,
  empty,
}: {
  columns: ColumnDef<T, unknown>[];
  rows: T[];
  /** Names the table for a screen reader; a table with no accessible name is a grid of unexplained cells. */
  label: string;
  loading: boolean;
  empty: { title: string; body: string };
}) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-card">
      <Table aria-label={label} aria-busy={loading || undefined}>
        {/* Tinted rather than outlined: with the card's border gone, the header
            needs to separate from the body without drawing a box around it. */}
        <TableHeader className="bg-surface-sunken/60">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  aria-sort={sortStateOf(header.column.columnDef.meta?.sorted)}
                  // Table ships 8px cells, which leaves text all but touching
                  // the card border. 16px gives the row an edge to sit against.
                  // `SortButton`'s -mx-2/px-2 lands its label on this same edge.
                  className="h-11 whitespace-nowrap px-4"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {loading && rows.length === 0 ? (
            <LoadingRows columns={columns.length} />
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="h-40 px-4 text-center align-middle">
                <p className="font-semibold">{empty.title}</p>
                <p className="mt-1.5 text-[0.8125rem] text-ink-muted">{empty.body}</p>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function sortStateOf(
  sorted: "asc" | "desc" | undefined,
): "ascending" | "descending" | undefined {
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return undefined;
}

function LoadingRows({ columns }: { columns: number }) {
  return (
    <>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={columns}>
          <span className="sr-only">Loading.</span>
        </TableCell>
      </TableRow>
      {Array.from({ length: 5 }, (_, row) => (
        <TableRow key={row} aria-hidden className="hover:bg-transparent">
          {Array.from({ length: columns }, (_, column) => (
            <TableCell key={column} className="px-4 py-3">
              {/* Skeleton defaults to `bg-accent`, which is the brand tint —
                  brand means action here, and a placeholder is not one. */}
              <Skeleton className="h-5 w-full bg-surface-sunken" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * A sortable column header.
 *
 * A real `<button>` rather than a clickable `<th>`: sorting is an action, and an
 * action a keyboard cannot reach is an action half the users do not have.
 */
export function SortButton({
  label,
  column,
  activeColumn,
  activeDirection,
  onSort,
}: {
  label: string;
  column: string;
  activeColumn: string;
  activeDirection: "asc" | "desc";
  onSort: (column: string) => void;
}) {
  const active = column === activeColumn;
  const Icon = !active ? ChevronsUpDown : activeDirection === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        "-mx-2 inline-flex items-center gap-1.5 rounded-chip px-2 py-1 font-semibold",
        "hover:bg-surface-sunken",
        active ? "text-ink" : "text-ink-muted",
      )}
    >
      {label}
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span className="sr-only">
        {active
          ? `Sorted ${activeDirection === "asc" ? "ascending" : "descending"}. Activate to reverse.`
          : "Not sorted. Activate to sort."}
      </span>
    </button>
  );
}

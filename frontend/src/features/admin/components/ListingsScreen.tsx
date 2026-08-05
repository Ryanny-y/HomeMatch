"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { AdminListingDto, AdminListingQuery } from "@homematch/shared";
import type { ColumnDef } from "@tanstack/react-table";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { DataTable, SortButton } from "@/features/admin/components/DataTable";
import { TablePagination } from "@/features/admin/components/TablePagination";
import { TableToolbar } from "@/features/admin/components/TableToolbar";
import { ListingRowActions } from "@/features/admin/components/ListingRowActions";
import { useAdminListings, useBarangays } from "@/features/admin/hooks/useAdmin";
import { useTableQuery } from "@/features/admin/hooks/useTableQuery";
import {
  EMPTY_LISTINGS,
  PROPERTY_TYPE_OPTIONS,
  STATUS_LABEL,
  STATUS_OPTIONS,
} from "@/features/admin/content";

/**
 * Status wears the colour contract, not shadcn's variants.
 *
 * `variant="default"` paints `--primary`, which in this product means *action* —
 * buttons, links, focus. A live listing rendered in the action colour reads as
 * something to click. `live` is the role that already means "renters can see
 * this", so publication state uses it and nothing else does.
 */
const STATUS_BADGE = {
  published: "border-transparent bg-live-soft text-live-ink",
  draft: "border-transparent bg-surface-sunken text-ink-muted",
  // `ink-faint` here was 2.4:1 against the tint — recessive to the point of
  // unreadable. Archived should be quiet, not illegible.
  archived: "border-transparent bg-surface-sunken/60 text-ink-muted",
} as const;

export function ListingsScreen({ query }: { query: AdminListingQuery }) {
  const { setParams, toggleSort } = useTableQuery();
  const { data, isFetching, error } = useAdminListings(query);
  const { data: barangays } = useBarangays();
  const [announcement, setAnnouncement] = useState("");

  const onSearch = useCallback((value: string) => setParams({ q: value }), [setParams]);

  const onFacet = useCallback(
    (name: string, value: string) => setParams({ [name]: value === "any" ? "" : value }),
    [setParams],
  );

  const onSort = useCallback(
    (column: string) => toggleSort(column, query.sort, query.direction),
    [toggleSort, query.sort, query.direction],
  );

  const columns = useMemo<ColumnDef<AdminListingDto, unknown>[]>(
    () => [
      {
        id: "unit",
        meta: { sorted: query.sort === "title" ? query.direction : undefined },
        header: () => (
          <SortButton
            label="Unit"
            column="title"
            activeColumn={query.sort}
            activeDirection={query.direction}
            onSort={onSort}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0 max-w-72">
            <p className="truncate font-semibold leading-tight">{row.original.title}</p>
            <p className="mt-1 truncate text-[0.8125rem] leading-tight text-ink-muted">
              {row.original.barangay ?? row.original.address}
            </p>
          </div>
        ),
      },
      {
        id: "owner",
        header: () => "Owner",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-56">
            <p className="truncate text-[0.8125rem] leading-tight">
              {row.original.owner.fullName}
            </p>
            <p className="mt-1 truncate text-[0.8125rem] leading-tight text-ink-muted">
              {row.original.owner.email}
            </p>
          </div>
        ),
      },
      {
        id: "status",
        header: () => "Status",
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge variant="secondary" className={STATUS_BADGE[row.original.status]}>
              {STATUS_LABEL[row.original.status]}
            </Badge>
            {row.original.gaps.length > 0 && row.original.status !== "published" ? (
              <p className="text-[0.75rem] text-gold-ink">
                {row.original.gaps.length} gap
                {row.original.gaps.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "rent",
        meta: { sorted: query.sort === "rent" ? query.direction : undefined },
        header: () => (
          <SortButton
            label="Rent"
            column="rent"
            activeColumn={query.sort}
            activeDirection={query.direction}
            onSort={onSort}
          />
        ),
        cell: ({ row }) => (
          <span data-figure className="text-[0.8125rem] font-semibold">
            ₱{row.original.rent.toLocaleString("en-PH")}
          </span>
        ),
      },
      {
        id: "updated",
        meta: { sorted: query.sort === "updatedAt" ? query.direction : undefined },
        header: () => (
          <SortButton
            label="Updated"
            column="updatedAt"
            activeColumn={query.sort}
            activeDirection={query.direction}
            onSort={onSort}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[0.8125rem] text-ink-muted">
            {new Date(row.original.updatedAt).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ListingRowActions listing={row.original} onDone={setAnnouncement} />
          </div>
        ),
      },
    ],
    [query.sort, query.direction, onSort],
  );

  if (error) return <Alert tone="error">{error.message}</Alert>;

  const barangayOptions = [
    { value: "", label: "Any barangay" },
    ...(barangays ?? []).map((barangay) => ({ value: barangay, label: barangay })),
  ];

  return (
    <div>
      <TableToolbar
        searchLabel="Search title or address"
        searchValue={query.q ?? ""}
        facets={[
          {
            name: "status",
            label: "Status",
            value: query.status ?? "",
            options: STATUS_OPTIONS,
          },
          {
            name: "propertyType",
            label: "Type",
            value: query.propertyType ?? "",
            options: PROPERTY_TYPE_OPTIONS,
          },
          {
            name: "barangay",
            label: "Barangay",
            value: query.barangay ?? "",
            options: barangayOptions,
          },
        ]}
        /**
         * The page's one filled control, and a real route — the landlord
         * editor accepts an admin, and seeding the catalog is what this account
         * exists for. Nothing else here is brand-filled, so this is where the
         * eye goes.
         */
        action={
          <Button asChild className="h-10 sm:h-9">
            <Link href="/landlord/listings/new">
              <Plus aria-hidden />
              Add a listing
            </Link>
          </Button>
        }
        onSearch={onSearch}
        onFacet={onFacet}
        onClear={() =>
          setParams({ q: "", status: "", propertyType: "", barangay: "", ownerId: "" })
        }
      />

      {query.ownerId ? (
        <div className="pb-4">
          <Alert tone="info">
            Showing one owner&rsquo;s listings. Use Clear to see every listing again.
          </Alert>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {announcement ? (
        <div className="pb-4">
          <Alert tone="info">{announcement}</Alert>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        label="Listings across every owner"
        loading={isFetching}
        empty={EMPTY_LISTINGS}
      />

      <TablePagination
        page={query.page}
        pageSize={query.pageSize}
        total={data?.total ?? 0}
        onPage={(page) => setParams({ page })}
      />
    </div>
  );
}

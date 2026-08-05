"use client";

import { useCallback, useMemo, useState } from "react";
import type { AdminUserDto, AdminUserQuery } from "@homematch/shared";
import type { ColumnDef } from "@tanstack/react-table";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/shadcn/badge";
import { DataTable, SortButton } from "@/features/admin/components/DataTable";
import { TablePagination } from "@/features/admin/components/TablePagination";
import { TableToolbar } from "@/features/admin/components/TableToolbar";
import { UserRowActions } from "@/features/admin/components/UserRowActions";
import { useAdminUsers } from "@/features/admin/hooks/useAdmin";
import { useTableQuery } from "@/features/admin/hooks/useTableQuery";
import {
  EMPTY_USERS,
  ROLE_LABEL,
  ROLE_OPTIONS,
  VERIFIED_OPTIONS,
} from "@/features/admin/content";

export function UsersScreen({
  query,
  currentUserId,
}: {
  query: AdminUserQuery;
  currentUserId: string;
}) {
  const { setParams, toggleSort } = useTableQuery();
  const { data, isFetching, error } = useAdminUsers(query);
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

  const columns = useMemo<ColumnDef<AdminUserDto, unknown>[]>(
    () => [
      {
        id: "person",
        meta: { sorted: query.sort === "email" ? query.direction : undefined },
        header: () => (
          <SortButton
            label="Person"
            column="email"
            activeColumn={query.sort}
            activeDirection={query.direction}
            onSort={onSort}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0 max-w-80">
            <p className="truncate font-semibold leading-tight">
              {row.original.fullName}
            </p>
            <p className="mt-1 truncate text-[0.8125rem] leading-tight text-ink-muted">
              {row.original.email}
            </p>
          </div>
        ),
      },
      {
        id: "role",
        meta: { sorted: query.sort === "role" ? query.direction : undefined },
        header: () => (
          <SortButton
            label="Role"
            column="role"
            activeColumn={query.sort}
            activeDirection={query.direction}
            onSort={onSort}
          />
        ),
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            /**
             * Admin is tinted with the brand, not filled with it: a filled
             * `--primary` badge reads as a button, and the action colour is
             * spent on actions. The tint flags the one row whose actions are
             * refused, which is closer to a state than to an identity.
             */
            className={
              row.original.role === "admin"
                ? "border-transparent bg-brand-soft text-brand-dark"
                : "border-transparent bg-surface-sunken text-ink-soft"
            }
          >
            {ROLE_LABEL[row.original.role]}
          </Badge>
        ),
      },
      {
        id: "verified",
        header: () => "Email",
        cell: ({ row }) =>
          row.original.emailVerified ? (
            <span className="text-[0.8125rem] text-live-ink">Verified</span>
          ) : (
            <span className="text-[0.8125rem] text-gold-ink">Unverified</span>
          ),
      },
      {
        id: "listings",
        header: () => "Listings",
        cell: ({ row }) => (
          <span data-figure className="text-[0.8125rem]">
            {row.original.listingCount}
          </span>
        ),
      },
      {
        id: "joined",
        meta: { sorted: query.sort === "createdAt" ? query.direction : undefined },
        header: () => (
          <SortButton
            label="Joined"
            column="createdAt"
            activeColumn={query.sort}
            activeDirection={query.direction}
            onSort={onSort}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[0.8125rem] text-ink-muted">
            {new Date(row.original.createdAt).toLocaleDateString("en-PH", {
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
            <UserRowActions
              user={row.original}
              currentUserId={currentUserId}
              onDone={setAnnouncement}
            />
          </div>
        ),
      },
    ],
    [query.sort, query.direction, onSort, currentUserId],
  );

  if (error) return <Alert tone="error">{error.message}</Alert>;

  return (
    <div>
      <TableToolbar
        searchLabel="Search name or email"
        searchValue={query.q ?? ""}
        facets={[
          {
            name: "role",
            label: "Role",
            value: query.role ?? "",
            options: ROLE_OPTIONS,
          },
          {
            name: "verified",
            label: "Email",
            value: query.verified === undefined ? "" : String(query.verified),
            options: VERIFIED_OPTIONS,
          },
        ]}
        onSearch={onSearch}
        onFacet={onFacet}
        onClear={() => setParams({ q: "", role: "", verified: "" })}
      />

      {/* Actions have no toast to land in, so their outcome is announced here —
          polite, so it never interrupts what a screen reader is already saying. */}
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
        label="Accounts"
        loading={isFetching}
        empty={EMPTY_USERS}
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

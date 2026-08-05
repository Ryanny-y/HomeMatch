"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthenticatedUser } from "@homematch/shared";
import { Building2, LayoutDashboard, Users, ExternalLink } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/shadcn/sidebar";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import { Separator } from "@/components/shadcn/separator";
import { Wordmark } from "@/components/ui/Logo";
import { ADMIN_NAV, navItemFor } from "@/features/admin/content";

/** First letters of the first two words — "HomeMatch Admin" reads as HA. */
function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

const ICONS = {
  "/admin": LayoutDashboard,
  "/admin/users": Users,
  "/admin/listings": Building2,
} as const;

/**
 * The admin chrome — sidebar, and a header that names the page.
 *
 * Outside the `(shell)` route group on purpose: that group renders
 * `SiteHeader` and `SiteFooter`, and a dashboard with its own nav rail does not
 * want the marketing header stacked on top of it.
 */
export function AdminShell({
  user,
  children,
}: {
  user: AuthenticatedUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = navItemFor(pathname);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="h-[4.25rem] justify-center px-4 group-data-[collapsible=icon]:px-0">
          <Wordmark href="/admin" className="group-data-[collapsible=icon]:hidden" />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-3 py-4">
            <SidebarGroupContent>
              {/* Roomier than the stock rail: `h-8`/14px is tuned for a dense
                  many-item sidebar. Three destinations can afford 40px rows and
                  a 15px label, which is what makes them read as places rather
                  than as a list. */}
              <SidebarMenu className="gap-1.5">
                {ADMIN_NAV.map((item) => {
                  const Icon = ICONS[item.href];
                  // `/admin` would otherwise match every child route.
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="h-10 gap-3 px-3 text-[0.9375rem] data-[active=true]:font-semibold group-data-[collapsible=icon]:px-2! [&>svg]:size-[1.125rem]"
                      >
                        <Link href={item.href} aria-current={active ? "page" : undefined}>
                          <Icon aria-hidden />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-2 px-3 pb-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Back to the site"
                className="h-10 gap-3 px-3 text-[0.9375rem] group-data-[collapsible=icon]:px-2! [&>svg]:size-[1.125rem]"
              >
                <Link href="/">
                  <ExternalLink aria-hidden />
                  <span>Back to the site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Who you are, not just which address you used. The name is the thing
              a second admin account would be told apart by. */}
          <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-3 group-data-[collapsible=icon]:hidden">
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-soft text-[0.75rem] font-semibold text-brand-dark">
                {initialsOf(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-semibold leading-tight">
                {user.fullName}
              </p>
              <p className="truncate text-[0.75rem] leading-tight text-ink-muted">
                {user.email}
              </p>
            </div>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/*
       * The content well is `surface-sunken`, not `canvas`.
       *
       * Cards here carry no border, so the ground has to do that work: white on
       * `canvas` is a ~3% step and an unbordered card simply dissolves into it.
       * Sunken is the token that already means "recessed surface", so the well
       * reads as recessed and the cards read as raised, with no new colour.
       *
       * The sidebar and header stay white, which turns them into one continuous
       * chrome frame around the well.
       */}
      <SidebarInset className="bg-surface-sunken">
        <header className="sticky top-0 z-30 flex h-[4.25rem] shrink-0 items-center gap-3 border-b border-line/60 bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="min-w-0">
            <h1 className="truncate text-[1.0625rem] font-bold tracking-[-0.02em]">
              {current.label}
            </h1>
            <p className="truncate text-[0.8125rem] text-ink-muted">
              {current.description}
            </p>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

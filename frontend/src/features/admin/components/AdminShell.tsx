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
import { Separator } from "@/components/shadcn/separator";
import { Wordmark } from "@/components/ui/Logo";
import { ADMIN_NAV, navItemFor } from "@/features/admin/content";

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

        <Separator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_NAV.map((item) => {
                  const Icon = ICONS[item.href];
                  // `/admin` would otherwise match every child route.
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
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

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Back to the site">
                <Link href="/">
                  <ExternalLink aria-hidden />
                  <span>Back to the site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="truncate px-2 pb-1 text-[0.75rem] text-ink-faint group-data-[collapsible=icon]:hidden">
            Signed in as {user.email}
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-[4.25rem] shrink-0 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
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

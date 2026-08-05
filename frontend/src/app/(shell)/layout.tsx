import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { UnsavedChangesProvider } from "@/providers/UnsavedChangesProvider";
import { currentUser } from "@/lib/session";

/**
 * Chrome for the signed-in app. The header needs to know who is here.
 *
 * `UnsavedChangesProvider` wraps both the header and the page because that is
 * the only level where they meet: a form holds the unsaved state, and every way
 * out of it is a link in the header. It stays inert until a form registers.
 */
export default async function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    <UnsavedChangesProvider>
      <SiteHeader user={user} />
      {children}
      <SiteFooter />
    </UnsavedChangesProvider>
  );
}

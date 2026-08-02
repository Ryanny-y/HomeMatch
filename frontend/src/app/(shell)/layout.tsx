import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/session";

/** Chrome for the signed-in app. The header needs to know who is here. */
export default async function ShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    <>
      <SiteHeader user={user} />
      {children}
      <SiteFooter />
    </>
  );
}

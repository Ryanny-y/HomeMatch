import Link from "next/link";
import { PiArrowLeft } from "react-icons/pi";

import { Wordmark } from "@/components/ui/Logo";
import { CostContrast } from "@/features/auth";
import { SITE } from "@/lib/site";

/**
 * Shell for every auth screen: form on the left, the product's argument on the
 * right. The panel restates the thesis so what you signed up for is on screen
 * while you do it. It is hidden below `lg` rather than stacked — on a phone,
 * nothing should come between the form and the keyboard.
 *
 * The panel used to be a deep-blue billboard carrying the landing page's full
 * six-colour cost card. On a screen whose entire job is "type two fields and
 * submit", that put a saturated hue across half the viewport and eight more
 * inside it, none of them naming anything the visitor had to act on. It is now
 * a quiet tonal step off the form — one shade, a hairline, and a single accent
 * in the bar. The argument is unchanged; only its volume is.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex w-full flex-col px-5 py-7 sm:px-10 sm:py-9">
        <header className="flex items-center justify-between gap-4">
          <Wordmark />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-ink-muted transition-colors hover:text-brand"
          >
            <PiArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to home
          </Link>
        </header>

        <main id="main" className="flex flex-1 items-center py-12 sm:py-16">
          <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        </main>

        <footer className="text-[0.8125rem] text-ink-muted">
          Made for {SITE.city}
        </footer>
      </div>

      {/* Deliberately inert. On an auth screen this panel is the reason you are
          signing up, not the thing you came to watch — motion here would
          compete with the form for attention. */}
      <aside className="hidden border-l border-line bg-surface-sunken p-12 lg:flex lg:flex-col lg:justify-center xl:p-16">
        <p className="max-w-md text-[clamp(1.75rem,2.4vw,2.375rem)] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink">
          Rent is not the price.
        </p>

        <p className="mt-4 max-w-md leading-[1.6] text-ink-muted">
          Every listing here carries its whole cost — parking, utilities,
          internet, dues, and the money it takes just to move in — so you can
          compare apartments on the figure that actually leaves your account.
        </p>

        {/* Same measure as the paragraph above, so the panel reads as one
            column rather than two blocks with a ragged right edge. */}
        <div className="mt-10 max-w-md">
          <CostContrast />
        </div>
      </aside>
    </div>
  );
}

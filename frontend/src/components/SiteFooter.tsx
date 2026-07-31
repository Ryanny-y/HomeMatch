import Link from "next/link";
import { PiMapPinLine } from "react-icons/pi";

import { Wordmark } from "@/components/ui/Logo";
import { SITE, SIGNUP_LANDLORD } from "@/lib/site";

/**
 * Footer.
 *
 * The brief's rule is that nothing links to a 404: an item is either a real
 * route, an anchor on this page, a mailto, or a visibly disabled entry. The
 * union type below makes that structural — there is no way to add a link
 * without deciding which of those it is.
 */

type FooterItem =
  | { label: string; href: string; external?: boolean }
  | { label: string; pending: true };

type FooterColumn = {
  heading: string;
  items: readonly FooterItem[];
};

const COLUMNS: readonly FooterColumn[] = [
  {
    heading: "Product",
    items: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#match-score" },
      { label: "Browse apartments", href: "/browse" },
      { label: "Pricing", pending: true },
    ],
  },
  {
    heading: "For landlords",
    items: [
      { label: "List a property", href: SIGNUP_LANDLORD },
      { label: "Landlord dashboard", href: "/landlord" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", href: "/#coverage" },
      { label: "Contact", href: `mailto:${SITE.contactEmail}`, external: true },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Terms of Service", pending: true },
      { label: "Privacy Policy", pending: true },
    ],
  },
];

const linkClasses =
  "text-[0.9375rem] text-white/65 transition-colors hover:text-white";

function FooterEntry({ item }: { item: FooterItem }) {
  if ("pending" in item) {
    return (
      <span className="inline-flex items-center gap-2 text-[0.9375rem] text-white/45">
        {item.label}
        <span className="rounded-full border border-white/20 px-1.5 py-px font-mono text-[0.5625rem] tracking-[0.08em] uppercase">
          Soon
        </span>
      </span>
    );
  }

  if (item.external) {
    return (
      <a href={item.href} className={linkClasses}>
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={linkClasses}>
      {item.label}
    </Link>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] lg:gap-8">
          <div className="max-w-xs">
            <Wordmark onDark />
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/65">
              An apartment decision platform for Metro Manila. Match scores,
              true monthly cost, and side-by-side comparisons — so you can
              choose, not just browse.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="font-mono text-[0.625rem] font-semibold tracking-[0.1em] uppercase text-white">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.items.map((item) => (
                  <li key={item.label}>
                    <FooterEntry item={item} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/12 pt-6 text-[0.8125rem] text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5">
            <PiMapPinLine aria-hidden="true" className="h-4 w-4" />
            Made for {SITE.city}
          </p>
          <p>
            © {year} {SITE.name}
          </p>
        </div>
      </div>
    </footer>
  );
}

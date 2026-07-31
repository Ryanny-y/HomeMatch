import Link from "next/link";
import { PiHouseLineFill } from "react-icons/pi";

import { SITE } from "@/lib/site";

export function Wordmark({
  className,
  href = "/",
  onDark = false,
}: {
  className?: string;
  href?: string;
  onDark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2.5 ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-8 w-8 items-center justify-center rounded-chip transition-colors ${
          onDark
            ? "bg-white text-brand-deep group-hover:bg-gold group-hover:text-ink"
            : "bg-brand text-white group-hover:bg-brand-deep"
        }`}
      >
        <PiHouseLineFill className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span
        className={`text-[1.0625rem] font-extrabold tracking-[-0.035em] ${
          onDark ? "text-white" : "text-ink"
        }`}
      >
        {SITE.name}
      </span>
    </Link>
  );
}

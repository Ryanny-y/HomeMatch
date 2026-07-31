"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PiList, PiX } from "react-icons/pi";

import { ButtonLink } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Logo";
import { PRIMARY_NAV, SIGNUP_RENTER } from "@/lib/site";

/**
 * Sticky site header.
 *
 * On narrow screens the nav collapses into a disclosure panel rather than a
 * full-screen overlay: the panel is short, so pushing content down is less
 * disorienting than covering it, and it avoids the focus-trap and
 * scroll-locking machinery an overlay would need to be accessible.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main"
        className="skip-link rounded-chip bg-brand px-4 py-2 text-sm font-semibold text-white"
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-50 bg-canvas/85 backdrop-blur-md transition-shadow duration-200 ${
          scrolled || menuOpen
            ? "border-b border-line shadow-[0_1px_16px_rgb(15_23_42/0.06)]"
            : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-[4.25rem] w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
          <Wordmark />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_NAV.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-chip px-3 py-2 text-[0.9375rem] font-medium text-ink-muted transition-colors hover:bg-brand-soft hover:text-brand-dark"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-chip px-3 py-2 text-[0.9375rem] font-medium text-ink-muted transition-colors hover:text-brand-dark"
            >
              Log in
            </Link>
            <ButtonLink href={SIGNUP_RENTER}>Get started</ButtonLink>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-chip text-ink lg:hidden"
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            {menuOpen ? (
              <PiX aria-hidden="true" className="h-5 w-5" />
            ) : (
              <PiList aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>

        {menuOpen ? (
          <div
            id="mobile-nav"
            className="panel-in border-t border-line bg-canvas lg:hidden"
          >
            <nav aria-label="Main" className="mx-auto w-full max-w-6xl px-5 py-4 sm:px-8">
              <ul className="divide-y divide-line">
                {PRIMARY_NAV.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 font-medium text-ink-soft transition-colors hover:text-brand-dark"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 font-medium text-ink-soft transition-colors hover:text-brand-dark"
                  >
                    Log in
                  </Link>
                </li>
              </ul>

              <ButtonLink
                href={SIGNUP_RENTER}
                size="lg"
                onClick={() => setMenuOpen(false)}
                className="mt-4 w-full"
              >
                Get started
              </ButtonLink>
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}

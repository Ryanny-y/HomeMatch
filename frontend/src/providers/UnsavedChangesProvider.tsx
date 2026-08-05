"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/Dialog";

/**
 * One place that knows a form has unsaved work, so leaving the page can be
 * interrupted.
 *
 * Cross-cutting on purpose, which is the bar `frontend/CLAUDE.md` sets for
 * context: the editor holds the unsaved state, but every way out of it — the
 * header nav, sign out — is rendered by `(shell)/layout.tsx`, outside the form.
 * Nothing else can see both.
 *
 * It is inert until a form registers itself dirty, so the shell pays nothing
 * for it on the pages that do not.
 *
 * **This cannot save the work, only stop it being discarded silently.** The
 * listing editor used to save each field on blur, which meant a closed tab lost
 * nothing; moving to an explicit Save reintroduced that risk, and this is the
 * mitigation rather than an equivalent.
 */
type UnsavedChanges = {
  /** Registers or clears this page's unsaved state. */
  setDirty: (dirty: boolean) => void;
  /**
   * Whether a navigation to `href` may proceed. When it may not, the
   * confirmation opens and the caller must cancel the navigation.
   */
  requestLeave: (href: string) => boolean;
};

const Context = createContext<UnsavedChanges | null>(null);

/**
 * For a form registering its unsaved state.
 *
 * Throws outside the provider, as `frontend/CLAUDE.md` prescribes: a form whose
 * registration is silently dropped is a guard that does not work, and that
 * should fail loudly rather than at the moment someone loses an edit.
 */
export function useUnsavedChanges(): UnsavedChanges {
  const value = useContext(Context);

  if (!value) {
    throw new Error("useUnsavedChanges must be used inside UnsavedChangesProvider");
  }

  return value;
}

/** Stable identity, so a guarded link's props do not change every render. */
const ALWAYS_ALLOW = () => true;

/**
 * For chrome asking permission to navigate.
 *
 * Deliberately tolerant where the hook above is strict. `SiteHeader` renders on
 * the landing page and the 404 as well as inside the shell, and on those there
 * is no form and nothing to lose — so a missing provider is the correct answer
 * ("go ahead"), not a bug worth crashing a 404 page over. It was exactly that
 * crash that caught this.
 */
export function useLeaveGuard(): (href: string) => boolean {
  return useContext(Context)?.requestLeave ?? ALWAYS_ALLOW;
}

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [dirty, setDirtyState] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  /**
   * Attached only while there is something to lose, so a clean page carries no
   * listener at all — and the handler cannot read a stale `dirty`, because it
   * only exists when `dirty` is true.
   */
  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      // The spec wants both. Browsers ignore any custom message and show their
      // own, so there is nothing to word here.
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const setDirty = useCallback((next: boolean) => setDirtyState(next), []);

  const requestLeave = useCallback(
    (href: string) => {
      if (!dirty) return true;

      setPending(href);
      return false;
    },
    [dirty],
  );

  return (
    <Context.Provider value={{ setDirty, requestLeave }}>
      {children}

      <ConfirmDialog
        open={pending !== null}
        title="Leave without saving?"
        body="Your unsaved changes on this page will be lost."
        confirmLabel="Leave"
        cancelLabel="Keep editing"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const href = pending;
          setPending(null);
          setDirtyState(false);
          if (href) router.push(href);
        }}
      />
    </Context.Provider>
  );
}

/**
 * Keeps the provider in step with one form's dirty state, and clears it on
 * unmount so a guard cannot outlive the page that set it.
 */
export function useRegisterUnsavedChanges(dirty: boolean): void {
  const { setDirty } = useUnsavedChanges();

  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
}

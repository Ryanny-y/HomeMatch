"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Built on the native `<dialog>` element, which is why there is no focus-trap
 * code here: `showModal()` traps focus, makes the rest of the page inert, and
 * wires Escape, all in the platform. A hand-rolled overlay would have to
 * reimplement three things browsers already get right.
 *
 * Used for destructive confirmation only. A dialog for anything reversible is a
 * speed bump, not a safeguard.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // `cancel` fires on Escape and on the backdrop close; routing it back
      // through onCancel keeps React state and the DOM in agreement.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-card border border-line bg-surface p-0 text-ink shadow-card-lift backdrop:bg-ink/40"
    >
      <div className="p-6">
        <h2 className="text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
        <div className="mt-2 text-[0.9375rem] leading-[1.6] text-ink-muted">{body}</div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Keep it
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

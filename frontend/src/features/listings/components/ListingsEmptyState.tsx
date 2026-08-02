import { ButtonLink } from "@/components/ui/Button";

/**
 * Two empty states, and they are not the same thing.
 *
 * `ListingsEmptyState` is a landlord with nothing yet, so it teaches what the
 * screen will do for them. `FilterEmptyState` is a filter that matched nothing,
 * which is not a problem to solve — it needs a way back, not encouragement.
 */
export function ListingsEmptyState() {
  return (
    <div className="rounded-card border border-line bg-surface p-8 text-center shadow-card sm:p-12">
      <h2 className="text-xl font-extrabold tracking-[-0.02em] text-ink">
        Nothing listed yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[0.9375rem] leading-[1.6] text-ink-muted">
        Add a unit with its title, address, and rent — that takes a minute. From then on
        this page tells you exactly what renters still can&rsquo;t see, one thing at a
        time, until it&rsquo;s ready to go live.
      </p>
      <ButtonLink href="/landlord/listings/new" className="mt-6">
        Add your first unit
      </ButtonLink>
    </div>
  );
}

export function FilterEmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-dashed border-line-strong px-4 py-10 text-center">
      <p className="text-[0.9375rem] text-ink-muted">{label}</p>
      <ButtonLink href="/landlord" variant="secondary" className="mt-4">
        Show all units
      </ButtonLink>
    </div>
  );
}

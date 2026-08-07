"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { NumberField } from "@/components/ui/Field";
import { useProfile, useMarkOnboarded, useSaveProfile } from "@/features/profile/hooks/useProfile";
import { FIELD_ORDER, useProfileDraft } from "@/features/profile/hooks/useProfileDraft";
import { LocationCard } from "./LocationCard";
import { RubricGroup } from "./RubricGroup";
import { WantsGrid } from "./WantsGrid";

/**
 * The first thing a verified renter sees.
 *
 * **The same fields as `/profile`, not a second copy of them.** Every input here
 * is that feature's own component driven by the same `useProfileDraft` and the
 * same shared schema, so there is one set of rules to keep true. What this adds
 * is sequence and first-run copy — the things an edit surface genuinely cannot
 * do, because it waits rather than asks.
 *
 * Location leads because it is the field the very next screen consumes: the
 * catalog opens on these areas.
 *
 * Skipping is a real exit, not a nudge to be worn down. `EMPTY_RENTER_PREFERENCE`
 * exists because a partial profile is a first-class state, and a gate that
 * refuses to let someone past contradicts a rule the rest of this codebase
 * keeps. Both exits stamp `onboardedAt`, so neither one asks twice.
 */
export function OnboardingScreen() {
  const { data: preference, isPending, isError, error } = useProfile();

  if (isPending) return <Skeleton />;
  if (isError) return <Alert>{error.message}</Alert>;

  return <OnboardingForm preference={preference} />;
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="h-24 rounded-card bg-surface-sunken" />
      {[0, 1, 2].map((block) => (
        <div key={block} className="h-40 rounded-card bg-surface-sunken" />
      ))}
      <p className="sr-only">Loading.</p>
    </div>
  );
}

function OnboardingForm({
  preference,
}: {
  preference: NonNullable<ReturnType<typeof useProfile>["data"]>;
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [leaving, setLeaving] = useState(false);

  const save = useSaveProfile();
  const done = useMarkOnboarded();
  const { draft, errors, isDirty, set, toggleWant, addBarangay, removeBarangay, validateField, prepare } =
    useProfileDraft(preference);

  /**
   * `router.replace`, not `push`: onboarding is finished, and leaving it on the
   * history stack means Back walks the renter into a screen that would only
   * bounce them forward again.
   */
  function leave(): void {
    setLeaving(true);
    router.replace("/browse");
  }

  function focusFirstInvalid(): void {
    const field = FIELD_ORDER.find((name) => errors[name]);
    if (!field) return;

    form.current
      ?.querySelector<HTMLElement>(`[data-field="${field}"] input, [data-field="${field}"] textarea`)
      ?.focus();
  }

  async function finish(payload: ReturnType<typeof prepare>): Promise<void> {
    if (payload && Object.keys(payload).length > 0) {
      await save.mutateAsync(payload);
    }

    await done.mutateAsync();
    leave();
  }

  function onSubmit(event: React.FormEvent): void {
    event.preventDefault();

    const payload = prepare();

    if (!payload) {
      // `prepare` set the errors; the focus move has to wait for the render
      // that shows them, or it lands on a field with nothing to read.
      window.setTimeout(focusFirstInvalid, 0);
      return;
    }

    void finish(payload);
  }

  const working = save.isPending || done.isPending || leaving;
  const failure = save.error ?? done.error;

  return (
    <form ref={form} onSubmit={onSubmit} noValidate>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink">
          Let&rsquo;s narrow things down
        </h1>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-[1.6] text-ink-muted">
          Three questions. They decide which apartments you see first and how each one is
          scored — and you can change any of them later on your profile.
        </p>
      </header>

      <div className="space-y-6">
        <RubricGroup
          id="group-location"
          title="Where you'd live"
          description="The catalog opens on these areas. Add as many as you'd genuinely consider — you can clear them in one click on any search."
        >
          <LocationCard
            city={draft.preferredCity}
            barangays={draft.preferredBarangays}
            cityError={errors.preferredCity}
            barangaysError={errors.preferredBarangays}
            onCityChange={(value) => set("preferredCity", value)}
            onCityBlur={() => validateField("preferredCity")}
            onAdd={addBarangay}
            onRemove={removeBarangay}
          />
        </RubricGroup>

        <RubricGroup
          id="group-budget"
          title="Your budget"
          description="Measured against true monthly cost — rent plus every recurring charge — not the advertised rent."
        >
          <div data-field="budget" className="max-w-sm">
            <NumberField
              label="Most you'd pay a month"
              name="budget"
              prefix="₱"
              value={draft.budget}
              onChange={(value) => set("budget", value)}
              onBlur={() => validateField("budget")}
              error={errors.budget}
              required={false}
            />
          </div>
        </RubricGroup>

        <RubricGroup
          id="group-wants"
          title="What matters to you"
          description="Check anything that counts. Every box moves a listing's score — none of them hides a listing from you."
        >
          <WantsGrid selected={draft.wants} onToggle={toggleWant} />
        </RubricGroup>

        {failure ? <Alert>{failure.message}</Alert> : null}

        <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <p className="text-[0.875rem] leading-[1.6] text-ink-muted">
            {isDirty
              ? "You can change all of this later."
              : "Nothing here is required — skip it and browse everything."}
          </p>

          <div className="flex items-center gap-3 max-sm:w-full">
            <Button
              type="button"
              variant="secondary"
              disabled={working}
              onClick={() => void finish(null)}
              className="max-sm:flex-1"
            >
              Skip for now
            </Button>
            <Button type="submit" disabled={working} className="max-sm:flex-1">
              {working ? "Saving…" : "Save and browse"}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}

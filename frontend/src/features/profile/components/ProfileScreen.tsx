"use client";

import { useEffect, useRef, useState } from "react";
import type { AuthenticatedUser } from "@homematch/shared";
import { canScoreListings, MAX_OTHER_NEEDS_LENGTH } from "@homematch/shared";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { NumberField, TextareaField } from "@/components/ui/Field";
import { SaveBar } from "@/components/ui/SaveBar";
import { useProfile, useSaveProfile } from "@/features/profile/hooks/useProfile";
import { FIELD_ORDER, useProfileDraft } from "@/features/profile/hooks/useProfileDraft";
import { IdentityCard } from "./IdentityCard";
import { LocationCard } from "./LocationCard";
import { RubricGroup } from "./RubricGroup";
import { RubricRow } from "./RubricRow";
import { WantsGrid } from "./WantsGrid";

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="h-32 rounded-card bg-surface-sunken" />
      {[0, 1, 2, 3].map((block) => (
        <div key={block} className="h-40 rounded-card bg-surface-sunken" />
      ))}
      <p className="sr-only">Loading your profile.</p>
    </div>
  );
}

const SAVED_VISIBLE_MS = 3000;

export function ProfileScreen({ user }: { user: AuthenticatedUser }) {
  const { data: preference, isPending, isError, error } = useProfile();

  if (isPending) return <Skeleton />;
  if (isError) return <Alert>{error.message}</Alert>;

  return <ProfileForm user={user} preference={preference} />;
}

/**
 * Split from `ProfileScreen` because the draft has to be seeded from a profile
 * that already loaded. Keeping the hooks in the parent would mean initialising
 * editing state from data that is not there yet.
 */
function ProfileForm({
  user,
  preference,
}: {
  user: AuthenticatedUser;
  preference: NonNullable<ReturnType<typeof useProfile>["data"]>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [justSaved, setJustSaved] = useState(false);
  const save = useSaveProfile();
  const {
    draft,
    errors,
    dirtyCount,
    set,
    toggleWant,
    addBarangay,
    removeBarangay,
    validateField,
    prepare,
    reset,
    syncTo,
  } = useProfileDraft(preference);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const invalidCount = Object.values(errors).filter(Boolean).length;

  function focusFirstInvalid(): void {
    // `FIELD_ORDER` rather than a list repeated here: it is already in visual
    // order, so focus lands on the topmost bad field, and a field added to the
    // draft cannot be left out of this by omission.
    const field = FIELD_ORDER.find((name) => errors[name]);
    if (!field) return;

    form.current
      ?.querySelector<HTMLElement>(`[data-field="${field}"] input, [data-field="${field}"] textarea`)
      ?.focus();
  }

  function onSubmit(event: React.FormEvent): void {
    event.preventDefault();

    const payload = prepare();

    if (!payload) {
      // The errors were set by `prepare`; the focus move has to wait for the
      // render that shows them, or it lands on a field with nothing to read.
      window.setTimeout(focusFirstInvalid, 0);
      return;
    }

    save.mutate(payload, {
      onSuccess: (next) => {
        syncTo(next);
        setJustSaved(true);
      },
    });
  }

  const remaining = MAX_OTHER_NEEDS_LENGTH - draft.otherNeeds.length;

  return (
    <form ref={form} onSubmit={onSubmit} noValidate>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-ink">Your profile</h1>
        <p className="mt-2 max-w-2xl text-[0.9375rem] leading-[1.6] text-ink-muted">
          Every listing is scored against what&rsquo;s below. Change a line and the ranking
          changes with it.
        </p>
      </header>

      <div className="space-y-6">
        <IdentityCard user={user} />

        {canScoreListings(preference) ? null : (
          <Card tone="brand" className="p-6 sm:p-7">
            <h2 className="text-[1.0625rem] font-extrabold tracking-[-0.02em] text-ink">
              Nothing is weighed yet.
            </h2>
            <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-[1.6] text-pretty text-ink-soft">
              Set a budget and tell us what you&rsquo;re after, and listings get ranked against
              it. Until then they come back in the order they were posted.
            </p>
          </Card>
        )}

        <RubricGroup id="group-location" title="Where you'd live">
          <RubricRow
            id="consequence-location"
            consequence="The only line here that filters rather than scores — the catalog opens on these areas, and one click clears them."
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
          </RubricRow>
        </RubricGroup>

        <RubricGroup id="group-budget" title="Budget">
          <RubricRow
            id="consequence-budget"
            consequence="Measured against true monthly cost — rent plus every recurring charge — not the advertised rent."
          >
            <div data-field="budget">
              <NumberField
                label="Most you'd pay a month"
                name="budget"
                prefix="₱"
                value={draft.budget}
                onChange={(value) => set("budget", value)}
                onBlur={() => validateField("budget")}
                error={errors.budget}
                describedBy="consequence-budget"
              />
            </div>
          </RubricRow>
        </RubricGroup>

        <RubricGroup id="group-household" title="Household">
          <RubricRow
            id="consequence-household"
            consequence="Sets the room count a unit needs before it stops fitting."
          >
            <div data-field="householdSize">
              <NumberField
                label="People moving in"
                name="householdSize"
                value={draft.householdSize}
                onChange={(value) => set("householdSize", value)}
                onBlur={() => validateField("householdSize")}
                error={errors.householdSize}
                describedBy="consequence-household"
              />
            </div>
          </RubricRow>
        </RubricGroup>

        <RubricGroup
          id="group-wants"
          title="What you want"
          description="Check anything that matters. Every box you tick moves a listing's score — none of them hides a listing from you."
        >
          <WantsGrid selected={draft.wants} onToggle={toggleWant} />
        </RubricGroup>

        <RubricGroup id="group-other" title="Anything else">
          <RubricRow
            id="consequence-other"
            consequence="Counts the same as a ticked box. Write it the way you'd say it — a place, a distance, anything that would change your mind about a unit."
          >
            <div data-field="otherNeeds">
              <TextareaField
                label="What the boxes don't cover"
                name="otherNeeds"
                rows={4}
                placeholder="Near UP Diliman, ground floor, somewhere I can park a motorbike…"
                value={draft.otherNeeds}
                onChange={(value) => set("otherNeeds", value)}
                onBlur={() => validateField("otherNeeds")}
                error={errors.otherNeeds}
                describedBy="consequence-other"
              />
              {/* Hidden while the field is empty: "500 left" before a word is
                  typed is a limit nobody is near, announced as though it were
                  news. It appears once there is something to count down. */}
              {draft.otherNeeds.length > 0 ? (
                <p
                  // Silent until the limit is close. Announcing a countdown on
                  // every keystroke makes the field unusable with a screen reader.
                  aria-live={remaining <= 50 ? "polite" : "off"}
                  className={`mt-1.5 text-right text-[0.8125rem] ${
                    remaining < 0 ? "font-semibold text-danger" : "text-ink-faint"
                  }`}
                >
                  {remaining < 0 ? `${-remaining} over` : `${remaining} left`}
                </p>
              ) : null}
            </div>
          </RubricRow>
        </RubricGroup>

        {save.isError ? <Alert>{save.error.message}</Alert> : null}
      </div>

      <SaveBar
        dirtyCount={dirtyCount}
        invalidCount={invalidCount}
        saving={save.isPending}
        saved={justSaved && dirtyCount === 0}
        saveLabel="Save profile"
        savedLabel="Profile saved."
        onSave={() => form.current?.requestSubmit()}
        onDiscard={reset}
      />
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { computeTrueMonthlyCost, moveInTotal } from "@homematch/shared";
import type { GeocodePrecision, GeocodeResult } from "@homematch/shared";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import {
  CheckboxField,
  NumberField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/ui/Field";
import { SaveBar } from "@/components/ui/SaveBar";
import { ApiError } from "@/lib/api";
import { peso } from "@/lib/format";
import { useRegisterUnsavedChanges } from "@/providers/UnsavedChangesProvider";
import type { Listing } from "@/features/listings/api/listings.api";
import {
  useArchiveListing,
  useDeleteListing,
  useGeocode,
  usePublishListing,
  useUpdateListing,
} from "@/features/listings/hooks/useListings";
import { useListingDraft } from "@/features/listings/hooks/useListingDraft";
import { CostBreakdown } from "./CostBreakdown";
import { LocationPicker } from "./LocationPicker";
import { PhotoManager } from "./PhotoManager";
import { ReadinessStatement } from "./ReadinessStatement";

/**
 * The long half of the draft-first flow.
 *
 * Sections rather than a wizard: editing wants you to jump to one field, and a
 * wizard forces a second, different UI to do that. Section ids double as the
 * anchor targets the readiness chips link to.
 *
 * **Edits are held locally and committed by the Save bar**, matching `/profile`
 * and the create form. This replaced saving each field on blur, and the trade
 * is worth naming: blur-saving meant a landlord who filled three fields and
 * closed the tab kept three fields, which an explicit save cannot promise.
 * `UnsavedChangesProvider` is the mitigation — it cannot save the work, but it
 * stops the work being discarded without a word.
 *
 * Photos are the one exception and still write immediately: an upload is a file
 * transfer, not a form value, and holding the bytes until Save would make a
 * slow connection block the whole form.
 */

/**
 * What a non-rooftop match actually means, in the landlord's terms. A geocoder
 * that only resolved the barangay has put the pin in the middle of it, and the
 * commute times computed from that would be wrong by streets.
 */
const PRECISION_NOTE: Record<GeocodePrecision, string> = {
  rooftop: "",
  street: "that's the street, not the building. Drag the pin to the exact door.",
  barangay: "only the barangay matched. Drag the pin to the building.",
  approximate: "that's an approximate spot. Drag the pin to the building.",
};

const SAVED_VISIBLE_MS = 3000;

function Section({
  id,
  title,
  blurb,
  children,
}: {
  id: string;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      // scroll-mt keeps a linked heading clear of the sticky header.
      className="scroll-mt-24 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink">{title}</h2>
      {blurb ? (
        <p className="mt-1 text-[0.875rem] leading-snug text-ink-muted">{blurb}</p>
      ) : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function EditListingForm({ listing }: { listing: Listing }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const update = useUpdateListing(listing.id);
  const publish = usePublishListing();
  const archive = useArchiveListing();
  const destroy = useDeleteListing();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const {
    draft,
    errors,
    dirtyCount,
    isDirty,
    gaps,
    set,
    setPin,
    validateField,
    prepare,
    firstInvalid,
    reset,
    syncTo,
  } = useListingDraft(listing);

  useRegisterUnsavedChanges(isDirty);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), SAVED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const perBed = listing.listingType === "bedspace";
  const invalidCount = Object.values(errors).filter(Boolean).length;
  const ready = gaps.length === 0;

  function focusFirstInvalid(): void {
    const field = firstInvalid();
    if (!field) return;

    form.current
      ?.querySelector<HTMLElement>(
        `[data-field="${field}"] input, [data-field="${field}"] textarea`,
      )
      ?.focus();
  }

  /** Resolves to whether the save happened, so Publish can chain onto it. */
  async function commit(): Promise<boolean> {
    const payload = prepare();

    if (!payload) {
      // The errors were set by `prepare`; the focus move has to wait for the
      // render that shows them, or it lands on a field with nothing to read.
      window.setTimeout(focusFirstInvalid, 0);
      return false;
    }

    if (Object.keys(payload).length === 0) return true;

    try {
      syncTo(await update.mutateAsync(payload));
      return true;
    } catch {
      // Rendered by the mutation's own error state below.
      return false;
    }
  }

  function onSubmit(event: React.FormEvent): void {
    event.preventDefault();
    void commit().then((saved) => {
      if (saved) setJustSaved(true);
    });
  }

  /**
   * Address → pin.
   *
   * `applied` is the whole design. A landlord who dragged the marker onto a
   * specific rooftop has told us something no geocoder can match, so once a pin
   * exists a later address edit *offers* the new coordinates instead of taking
   * them. Only an unpinned listing is moved automatically.
   */
  const geocode = useGeocode();
  const [match, setMatch] = useState<{ result: GeocodeResult; applied: boolean } | null>(
    null,
  );
  const [target, setTarget] = useState<{ lat: number; lng: number } | null>(null);

  /**
   * Whether the pin on screen was placed by geocoding rather than by hand.
   *
   * "Does a pin exist" is the wrong question, and asking it was a bug: editing
   * address *and* barangay fires two lookups, and the second one saw the pin the
   * first had just set, so it offered to move the pin to where it already was.
   * A pin already present at mount is treated as the landlord's, since there is
   * no way to know otherwise.
   */
  const pinIsGeocoded = useRef(false);

  function applyMatch(result: GeocodeResult) {
    pinIsGeocoded.current = true;
    setTarget({ lat: result.lat, lng: result.lng });
    setPin({
      lat: result.lat,
      lng: result.lng,
      precision: result.precision,
      provider: result.provider,
      placeId: result.placeId,
    });
  }

  /**
   * Still fires on blur rather than waiting for Save: a lookup is not a write,
   * and holding it back would mean the landlord cannot see where the pin landed
   * until after committing the address that put it there.
   */
  function locate(overrides: { address?: string; barangay?: string } = {}) {
    const address = (overrides.address ?? draft.address).trim();
    if (address === "") return;

    const query = [address, overrides.barangay ?? draft.barangay, draft.city]
      .filter((part) => part && part.trim() !== "")
      .join(", ");

    geocode.mutate(query, {
      onSuccess: (result) => {
        const placedByHand =
          draft.lat !== null && draft.lng !== null && !pinIsGeocoded.current;

        if (!placedByHand) applyMatch(result);
        setMatch({ result, applied: !placedByHand });
      },
    });
  }

  async function onPublish() {
    setPublishError(null);

    // Publishing what is on screen rather than what was last saved. The server
    // gates on its own copy, so an unsaved description would otherwise be
    // judged missing by a check the landlord can see has been answered.
    if (!(await commit())) return;

    try {
      await publish.mutateAsync(listing.id);
    } catch (thrown) {
      setPublishError(
        thrown instanceof ApiError ? thrown.message : "That didn't publish. Try again.",
      );
    }
  }

  function onLocation(next: { lat: number; lng: number; precision: GeocodePrecision }) {
    // Moved by hand, so a later address edit must ask before replacing it. The
    // provider and place id no longer describe this point, and are cleared
    // rather than left pointing at somewhere the pin has since left.
    pinIsGeocoded.current = false;
    setMatch(null);
    setPin({ lat: next.lat, lng: next.lng, precision: next.precision });
  }

  const saving = update.isPending || publish.isPending;

  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge
              tone={
                listing.status === "published"
                  ? "live"
                  : listing.status === "archived"
                    ? "neutral"
                    : ready
                      ? "ready"
                      : "blocked"
              }
            >
              {listing.status === "published"
                ? "Live"
                : listing.status === "archived"
                  ? "Archived"
                  : ready
                    ? "Ready to publish"
                    : "Needs work"}
            </Badge>
            <h1 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">
              {listing.title}
            </h1>
          </div>

          {listing.status !== "published" ? (
            <Button
              type="button"
              onClick={() => void onPublish()}
              disabled={!ready || saving || invalidCount > 0}
            >
              {publish.isPending ? "Publishing…" : isDirty ? "Save and publish" : "Publish"}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => archive.mutate(listing.id)}
            >
              Archive
            </Button>
          )}
        </div>

        <div className="mt-5 border-t border-line pt-5">
          {/* Computed from the draft, so a gap closes as it is typed rather
              than only once the form has been saved. */}
          <ReadinessStatement gaps={gaps} listingId={listing.id} />
        </div>

        {publishError ? (
          <div className="mt-4">
            <Alert>{publishError}</Alert>
          </div>
        ) : null}

        {update.isError ? (
          <div className="mt-4">
            <Alert>{update.error.message}</Alert>
          </div>
        ) : null}
      </div>

      <Section id="description" title="The basics" blurb="What a renter reads first.">
        <div data-field="title">
          <TextField
            label="Title"
            name="title"
            value={draft.title}
            onChange={(value) => set("title", value)}
            onBlur={() => validateField("title")}
            error={errors.title}
            placeholder="Studio near Katipunan"
          />
        </div>
        <div data-field="description">
          <TextareaField
            label="Description"
            name="description"
            value={draft.description}
            onChange={(value) => set("description", value)}
            error={errors.description}
            placeholder="What's it like to live here? Be specific about the things a photo can't show."
            hint="Renters skip listings with nothing to read."
          />
        </div>
      </Section>

      <Section
        id="location"
        title="Where it is"
        blurb="Commute times are worked out from this pin, so it needs to be the actual building."
      >
        <div data-field="address">
          <TextField
            label="Address"
            name="address"
            value={draft.address}
            onChange={(value) => set("address", value)}
            onBlur={() => {
              validateField("address");
              locate();
            }}
            error={errors.address}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div data-field="barangay">
            <TextField
              label="Barangay"
              name="barangay"
              value={draft.barangay}
              onChange={(value) => set("barangay", value)}
              onBlur={() => locate()}
              error={errors.barangay}
              placeholder="Loyola Heights"
              required={false}
            />
          </div>
          <div data-field="city">
            <TextField
              label="City"
              name="city"
              value={draft.city}
              onChange={(value) => set("city", value)}
              onBlur={() => validateField("city")}
              error={errors.city}
            />
          </div>
        </div>

        <LocationPicker
          lat={draft.lat}
          lng={draft.lng}
          target={target}
          pending={geocode.isPending}
          onChange={onLocation}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => locate()}
            disabled={geocode.isPending || draft.address.trim() === ""}
          >
            {geocode.isPending ? "Looking…" : "Find address on map"}
          </Button>

          {geocode.isError ? (
            <p role="alert" className="text-[0.875rem] text-danger">
              {geocode.error.message}
            </p>
          ) : null}
        </div>

        {match ? (
          <div
            className={`rounded-chip border p-3.5 ${
              match.applied
                ? "border-live-line bg-live-soft"
                : "border-gold-line bg-gold-soft"
            }`}
          >
            <p className="text-[0.875rem] leading-snug text-ink-soft">
              {match.applied ? "Pin moved to " : "Found "}
              <strong className="font-semibold text-ink">{match.result.label}</strong>
              {match.result.precision !== "rooftop" ? (
                <span className="text-ink-muted">
                  {" "}
                  — {PRECISION_NOTE[match.result.precision]}
                </span>
              ) : null}
            </p>

            {/* Never taken automatically: the existing pin was placed by hand,
                and that outranks a geocoder's guess. */}
            {!match.applied ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    applyMatch(match.result);
                    setMatch({ result: match.result, applied: true });
                  }}
                >
                  Move the pin here
                </Button>
                <Button type="button" variant="secondary" onClick={() => setMatch(null)}>
                  Keep my pin
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Renters filter on this, so the wording has to match the checkbox they
            tick on their own profile — the two are describing one fact. */}
        <CheckboxField
          label="Near transit"
          name="nearTransit"
          hint="Walking distance to a jeepney, bus, or train."
          checked={draft.nearTransit}
          onChange={(checked) => set("nearTransit", checked)}
        />
      </Section>

      <Section
        id="rent"
        title="What it really costs"
        blurb="Every peso a renter pays each month. This is the number they compare on."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div data-field="rent">
            <NumberField
              label={perBed ? "Rent per bed" : "Monthly rent"}
              name="rent"
              value={draft.rent}
              onChange={(value) => set("rent", value)}
              onBlur={() => validateField("rent")}
              error={errors.rent}
              prefix="₱"
              suffix="/mo"
            />
          </div>
          <div data-field="otherFees">
            <NumberField
              label="Other monthly costs"
              name="otherFees"
              value={draft.otherFees}
              onChange={(value) => set("otherFees", value)}
              onBlur={() => validateField("otherFees")}
              error={errors.otherFees}
              prefix="₱"
              suffix="/mo"
              hint="Association dues, utilities, internet — anything paid monthly on top of rent. Leave blank if there's none."
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div data-field="depositMonths">
            <NumberField
              label="Deposit"
              name="depositMonths"
              value={draft.depositMonths}
              onChange={(value) => set("depositMonths", value)}
              onBlur={() => validateField("depositMonths")}
              error={errors.depositMonths}
              suffix="months"
            />
          </div>
          <div data-field="advanceMonths">
            <NumberField
              label="Advance"
              name="advanceMonths"
              value={draft.advanceMonths}
              onChange={(value) => set("advanceMonths", value)}
              onBlur={() => validateField("advanceMonths")}
              error={errors.advanceMonths}
              suffix="months"
            />
          </div>
        </div>

        <p className="text-[0.875rem] leading-snug text-ink-muted">
          A renter hands over{" "}
          <strong data-figure className="font-semibold text-ink">
            {peso(
              moveInTotal({
                rent: Number(draft.rent) || 0,
                depositMonths: Number(draft.depositMonths) || 0,
                advanceMonths: Number(draft.advanceMonths) || 0,
              }),
            )}
          </strong>{" "}
          before moving in. Paid once — it is not part of the monthly figure below.
        </p>

        <CheckboxField
          label="Utilities are included in the rent"
          name="utilitiesIncluded"
          checked={draft.utilitiesIncluded}
          onChange={(checked) => set("utilitiesIncluded", checked)}
          hint="If they aren't, fold a typical month into other monthly costs above."
        />

        <CheckboxField
          label="Parking is available"
          name="parkingAvailable"
          checked={draft.parkingAvailable}
          onChange={(checked) => set("parkingAvailable", checked)}
        />
        {draft.parkingAvailable ? (
          <div data-field="parkingCost">
            <NumberField
              label="Parking cost"
              name="parkingCost"
              value={draft.parkingCost}
              onChange={(value) => set("parkingCost", value)}
              onBlur={() => validateField("parkingCost")}
              error={errors.parkingCost}
              prefix="₱"
              suffix="/mo"
              hint="Leave blank if it's free."
            />
          </div>
        ) : null}

        <div className="rounded-chip bg-surface-sunken p-4">
          <CostBreakdown
            lines={computeTrueMonthlyCost({
              rent: Number(draft.rent) || 0,
              otherFees: draft.otherFees.trim() === "" ? null : Number(draft.otherFees),
              parkingAvailable: draft.parkingAvailable,
              parkingCost:
                draft.parkingCost.trim() === "" ? null : Number(draft.parkingCost),
            })}
            parkingIncluded={draft.parkingAvailable && draft.parkingCost.trim() === ""}
          />
        </div>
      </Section>

      <Section id="unit" title="The unit itself">
        {perBed ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div data-field="bedsPerRoom">
              <NumberField
                label="Beds per room"
                name="bedsPerRoom"
                value={draft.bedsPerRoom}
                onChange={(value) => set("bedsPerRoom", value)}
                onBlur={() => validateField("bedsPerRoom")}
                error={errors.bedsPerRoom}
              />
            </div>
            <SelectField
              label="Bathroom"
              name="bathroomAccess"
              value={draft.bathroomAccess ?? "shared"}
              onChange={(value) =>
                set("bathroomAccess", value as "shared" | "private")
              }
              options={[
                { value: "shared", label: "Shared" },
                { value: "private", label: "Private" },
              ]}
            />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <div data-field="bedrooms">
              <NumberField
                label="Bedrooms"
                name="bedrooms"
                value={draft.bedrooms}
                onChange={(value) => set("bedrooms", value)}
                onBlur={() => validateField("bedrooms")}
                error={errors.bedrooms}
              />
            </div>
            <div data-field="bathrooms">
              <NumberField
                label="Bathrooms"
                name="bathrooms"
                value={draft.bathrooms}
                onChange={(value) => set("bathrooms", value)}
                onBlur={() => validateField("bathrooms")}
                error={errors.bathrooms}
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField
            label="Furnished"
            name="furnished"
            hint="At least a bed and a place to cook."
            checked={draft.furnished}
            onChange={(checked) => set("furnished", checked)}
          />
          <CheckboxField
            label="Aircon"
            name="aircon"
            hint="Installed, not just an outlet for one."
            checked={draft.aircon}
            onChange={(checked) => set("aircon", checked)}
          />
        </div>
      </Section>

      <Section
        id="rules"
        title="House rules"
        blurb="The things renters ask about before viewing."
      >
        <CheckboxField
          label="Pets allowed"
          name="petsAllowed"
          checked={draft.petsAllowed}
          onChange={(checked) => set("petsAllowed", checked)}
        />
        {perBed ? (
          <>
            <SelectField
              label="Who can stay"
              name="genderPolicy"
              value={draft.genderPolicy ?? "any"}
              onChange={(value) =>
                set("genderPolicy", value as "any" | "male_only" | "female_only")
              }
              options={[
                { value: "any", label: "Anyone" },
                { value: "male_only", label: "Male only" },
                { value: "female_only", label: "Female only" },
              ]}
            />
            <div data-field="curfew">
              <TextField
                label="Curfew"
                name="curfew"
                value={draft.curfew}
                onChange={(value) => set("curfew", value)}
                error={errors.curfew}
                placeholder="Gate locks at 11pm"
                required={false}
              />
            </div>
          </>
        ) : null}
      </Section>

      <Section
        id="images"
        title="Photos"
        blurb="Listings without photos get skipped. These save as soon as you add them, so the Save bar doesn't apply to this section."
      >
        <PhotoManager listing={listing} />
      </Section>

      <section className="rounded-card border border-danger-line bg-danger-soft p-5 sm:p-6">
        <h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink">
          Delete this listing
        </h2>
        <p className="mt-1 max-w-prose text-[0.875rem] leading-snug text-ink-soft">
          Deleting removes the unit and its photos for good. If you just want it off
          the market, archive it instead — you keep everything and can relist next
          vacancy.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete listing
        </Button>
      </section>

      <SaveBar
        dirtyCount={dirtyCount}
        invalidCount={invalidCount}
        saving={saving}
        saved={justSaved && dirtyCount === 0}
        saveLabel="Save changes"
        savedLabel="Listing saved."
        onSave={() => form.current?.requestSubmit()}
        onDiscard={reset}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this listing?"
        body={
          <>
            <strong className="text-ink">{listing.title}</strong> and its{" "}
            {listing.images.length}{" "}
            {listing.images.length === 1 ? "photo" : "photos"} will be gone for good.
            Archiving keeps everything instead.
          </>
        }
        confirmLabel="Delete for good"
        pending={destroy.isPending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          destroy.mutate(listing.id, {
            onSuccess: () => router.push("/landlord"),
          });
        }}
      />
    </form>
  );
}

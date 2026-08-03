"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { computeTrueMonthlyCost, moveInTotal } from "@homematch/shared";
import type {
  GeocodePrecision,
  GeocodeResult,
  UpdateListingInput,
} from "@homematch/shared";
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
import { ApiError } from "@/lib/api";
import { peso } from "@/lib/format";
import type { Listing } from "@/features/listings/api/listings.api";
import {
  useArchiveListing,
  useDeleteListing,
  useGeocode,
  usePublishListing,
  useUpdateListing,
} from "@/features/listings/hooks/useListings";
import {
  useSavedField,
  useSavedNumberField,
} from "@/features/listings/hooks/useSavedField";
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
 * Fields save on blur, one PATCH per field. It costs more requests than a save
 * button, but a landlord who fills three fields and closes the tab keeps three
 * fields — and on a flaky mobile connection a single large submit is the thing
 * most likely to lose everything.
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
  const update = useUpdateListing(listing.id);
  const publish = usePublishListing();
  const archive = useArchiveListing();
  const destroy = useDeleteListing();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const perBed = listing.listingType === "bedspace";

  function save(patch: UpdateListingInput) {
    update.mutate(patch);
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

  function applyMatch(result: GeocodeResult) {
    setTarget({ lat: result.lat, lng: result.lng });
    save({
      lat: result.lat,
      lng: result.lng,
      geocodePrecision: result.precision,
      geocodeProvider: result.provider,
      externalPlaceId: result.placeId,
    });
  }

  function locate(overrides: { address?: string; barangay?: string } = {}) {
    const address = (overrides.address ?? listing.address).trim();
    if (address === "") return;

    const query = [address, overrides.barangay ?? listing.barangay, listing.city]
      .filter((part) => part && part.trim() !== "")
      .join(", ");

    geocode.mutate(query, {
      onSuccess: (result) => {
        const pinned = listing.lat !== null && listing.lng !== null;
        if (!pinned) applyMatch(result);
        setMatch({ result, applied: !pinned });
      },
    });
  }

  /**
   * Every typed field is a local draft that saves when it loses focus.
   *
   * Binding these straight to `listing` and saving per keystroke is what broke
   * the description (the schema trims, so a trailing space was deleted as it
   * was typed) and deposit/advance (an empty field fell back to the old number
   * and snapped back). See `useSavedField`.
   *
   * `false` on the last argument marks a field that must hold a number:
   * clearing it is allowed while typing and restored on blur.
   */
  const titleField = useSavedField(listing.title, (v) => {
    if (v.trim() === "") return false;
    save({ title: v });
    return true;
  });
  const descriptionField = useSavedField(listing.description ?? "", (v) => {
    save({ description: v });
    return true;
  });
  const addressField = useSavedField(listing.address, (v) => {
    if (v.trim() === "") return false;
    save({ address: v });
    locate({ address: v });
    return true;
  });
  const barangayField = useSavedField(listing.barangay ?? "", (v) => {
    save({ barangay: v });
    locate({ barangay: v });
    return true;
  });
  const cityField = useSavedField(listing.city, (v) => {
    if (v.trim() === "") return false;
    save({ city: v });
    return true;
  });
  const curfewField = useSavedField(listing.curfew ?? "", (v) => {
    save({ curfew: v });
    return true;
  });

  const rentField = useSavedNumberField(listing.rent, (v) => {
    if (v !== null) save({ rent: v });
  }, false);
  const depositMonthsField = useSavedNumberField(listing.depositMonths, (v) => {
    if (v !== null) save({ depositMonths: v });
  }, false);
  const advanceMonthsField = useSavedNumberField(listing.advanceMonths, (v) => {
    if (v !== null) save({ advanceMonths: v });
  }, false);

  const otherFeesField = useSavedNumberField(listing.otherFees, (v) => save({ otherFees: v }));
  const parkingCostField = useSavedNumberField(listing.parkingCost, (v) =>
    save({ parkingCost: v }),
  );
  const bedsPerRoomField = useSavedNumberField(listing.bedsPerRoom, (v) =>
    save({ bedsPerRoom: v }),
  );
  const bedroomsField = useSavedNumberField(listing.bedrooms, (v) => save({ bedrooms: v }));
  const bathroomsField = useSavedNumberField(listing.bathrooms, (v) => save({ bathrooms: v }));

  async function onPublish() {
    setPublishError(null);
    try {
      await publish.mutateAsync(listing.id);
    } catch (thrown) {
      setPublishError(
        thrown instanceof ApiError
          ? thrown.message
          : "That didn't publish. Try again.",
      );
    }
  }

  function onLocation(next: { lat: number; lng: number; precision: GeocodePrecision }) {
    save({ lat: next.lat, lng: next.lng, geocodePrecision: next.precision });
  }

  const ready = listing.gaps.length === 0;

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
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
              {update.isPending ? (
                <span className="text-[0.8125rem] text-ink-faint">Saving…</span>
              ) : null}
            </div>
            <h1 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-ink">
              {listing.title}
            </h1>
          </div>

          {listing.status !== "published" ? (
            <Button onClick={() => void onPublish()} disabled={!ready || publish.isPending}>
              {publish.isPending ? "Publishing…" : "Publish"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => archive.mutate(listing.id)}>
              Archive
            </Button>
          )}
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <ReadinessStatement gaps={listing.gaps} listingId={listing.id} />
        </div>

        {publishError ? (
          <div className="mt-4">
            <Alert>{publishError}</Alert>
          </div>
        ) : null}
      </div>

      <Section id="description" title="The basics" blurb="What a renter reads first.">
        <TextField
          label="Title"
          name="title"
          {...titleField}
          placeholder="Studio near Katipunan"
        />
        <TextareaField
          label="Description"
          name="description"
          {...descriptionField}
          placeholder="What's it like to live here? Be specific about the things a photo can't show."
          hint="Renters skip listings with nothing to read."
        />
      </Section>

      <Section
        id="location"
        title="Where it is"
        blurb="Commute times are worked out from this pin, so it needs to be the actual building."
      >
        <TextField
          label="Address"
          name="address"
          {...addressField}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Barangay"
            name="barangay"
            {...barangayField}
            placeholder="Loyola Heights"
            required={false}
          />
          <TextField
            label="City"
            name="city"
            {...cityField}
          />
        </div>

        <LocationPicker
          lat={listing.lat}
          lng={listing.lng}
          target={target}
          pending={geocode.isPending}
          onChange={onLocation}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => locate()}
            disabled={geocode.isPending || listing.address.trim() === ""}
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
                  onClick={() => {
                    applyMatch(match.result);
                    setMatch({ result: match.result, applied: true });
                  }}
                >
                  Move the pin here
                </Button>
                <Button variant="secondary" onClick={() => setMatch(null)}>
                  Keep my pin
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section
        id="rent"
        title="What it really costs"
        blurb="Every peso a renter pays each month. This is the number they compare on."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField
            label={perBed ? "Rent per bed" : "Monthly rent"}
            name="rent"
            {...rentField}
            prefix="₱"
            suffix="/mo"
          />
          <NumberField
            label="Other monthly costs"
            name="otherFees"
            {...otherFeesField}
            prefix="₱"
            suffix="/mo"
            hint="Association dues, utilities, internet — anything paid monthly on top of rent. Leave blank if there's none."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField
            label="Deposit"
            name="depositMonths"
            {...depositMonthsField}
            suffix="months"
          />
          <NumberField
            label="Advance"
            name="advanceMonths"
            {...advanceMonthsField}
            suffix="months"
          />
        </div>

        <p className="text-[0.875rem] leading-snug text-ink-muted">
          A renter hands over{" "}
          <strong data-figure className="font-semibold text-ink">
            {peso(
              moveInTotal({
                rent: listing.rent,
                depositMonths: listing.depositMonths,
                advanceMonths: listing.advanceMonths,
              }),
            )}
          </strong>{" "}
          before moving in. Paid once — it is not part of the monthly figure below.
        </p>

        <CheckboxField
          label="Utilities are included in the rent"
          name="utilitiesIncluded"
          checked={listing.utilitiesIncluded}
          onChange={(checked) => save({ utilitiesIncluded: checked })}
          hint="If they aren't, fold a typical month into other monthly costs above."
        />

        <CheckboxField
          label="Parking is available"
          name="parkingAvailable"
          checked={listing.parkingAvailable}
          onChange={(checked) => save({ parkingAvailable: checked })}
        />
        {listing.parkingAvailable ? (
          <NumberField
            label="Parking cost"
            name="parkingCost"
            {...parkingCostField}
            prefix="₱"
            suffix="/mo"
            hint="Leave blank if it's free."
          />
        ) : null}

        <div className="rounded-chip bg-surface-sunken p-4">
          <CostBreakdown
            lines={computeTrueMonthlyCost({
              rent: listing.rent,
              otherFees: listing.otherFees,
              parkingAvailable: listing.parkingAvailable,
              parkingCost: listing.parkingCost,
            })}
            parkingIncluded={listing.parkingAvailable && !listing.parkingCost}
          />
        </div>
      </Section>

      <Section id="unit" title="The unit itself">
        {perBed ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              label="Beds per room"
              name="bedsPerRoom"
              {...bedsPerRoomField}
            />
            <SelectField
              label="Bathroom"
              name="bathroomAccess"
              value={listing.bathroomAccess ?? "shared"}
              onChange={(value) =>
                save({ bathroomAccess: value as "shared" | "private" })
              }
              options={[
                { value: "shared", label: "Shared" },
                { value: "private", label: "Private" },
              ]}
            />
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <NumberField
              label="Bedrooms"
              name="bedrooms"
              {...bedroomsField}
            />
            <NumberField
              label="Bathrooms"
              name="bathrooms"
              {...bathroomsField}
            />
          </div>
        )}
      </Section>

      <Section id="rules" title="House rules" blurb="The things renters ask about before viewing.">
        <CheckboxField
          label="Pets allowed"
          name="petsAllowed"
          checked={listing.petsAllowed}
          onChange={(checked) => save({ petsAllowed: checked })}
        />
        {perBed ? (
          <>
            <SelectField
              label="Who can stay"
              name="genderPolicy"
              value={listing.genderPolicy ?? "any"}
              onChange={(value) =>
                save({ genderPolicy: value as "any" | "male_only" | "female_only" })
              }
              options={[
                { value: "any", label: "Anyone" },
                { value: "male_only", label: "Male only" },
                { value: "female_only", label: "Female only" },
              ]}
            />
            <TextField
              label="Curfew"
              name="curfew"
              {...curfewField}
              placeholder="Gate locks at 11pm"
              required={false}
            />
          </>
        ) : null}
      </Section>

      <Section id="images" title="Photos" blurb="Listings without photos get skipped.">
        <PhotoManager listing={listing} />
      </Section>

      <section className="rounded-card border border-danger-line bg-danger-soft p-5 sm:p-6">
        <h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink">
          Delete this listing
        </h2>
        <p className="mt-1 max-w-prose text-[0.875rem] leading-snug text-ink-soft">
          Deleting removes the unit and its photos for good. If you just want it
          off the market, archive it instead — you keep everything and can
          relist next vacancy.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => setConfirmingDelete(true)}
        >
          Delete listing
        </Button>
      </section>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this listing?"
        body={
          <>
            <strong className="text-ink">{listing.title}</strong> and its{" "}
            {listing.images.length}{" "}
            {listing.images.length === 1 ? "photo" : "photos"} will be gone for
            good. Archiving keeps everything instead.
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
    </div>
  );
}

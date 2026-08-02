"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { createListingSchema } from "@homematch/shared";
import type { CreateListingInput } from "@homematch/shared";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { NumberField, SelectField, TextField } from "@/components/ui/Field";
import { useZodForm } from "@/features/auth/hooks/useZodForm";
import { useCreateListing } from "@/features/listings/hooks/useListings";

/**
 * The short half of a draft-first flow.
 *
 * Five fields, then the listing exists. Everything that makes it *decidable*
 * for a renter — the cost breakdown, the pin, photos — is asked for on the edit
 * screen, and required only to publish. A landlord on mobile data should not
 * face twenty-five inputs before anything is saved.
 */
const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" },
  { value: "boarding_house", label: "Boarding house" },
] as const;

const LISTING_TYPES = [
  { value: "whole_unit", label: "The whole unit" },
  { value: "bedspace", label: "A bedspace" },
] as const;

export function NewListingForm() {
  const router = useRouter();
  const create = useCreateListing();

  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("apartment");
  const [listingType, setListingType] = useState("whole_unit");
  const [address, setAddress] = useState("");
  const [rent, setRent] = useState("");

  const values = useMemo(
    () => ({
      title,
      propertyType,
      listingType,
      address,
      rent: rent === "" ? Number.NaN : Number(rent),
    }),
    [title, propertyType, listingType, address, rent],
  );

  const submit = useCallback(
    (input: CreateListingInput) => create.mutateAsync(input),
    [create],
  );

  const onSuccess = useCallback(
    (listing: { id: string }) => router.push(`/landlord/listings/${listing.id}/edit`),
    [router],
  );

  const { errors, formError, pending, formRef, handleSubmit } = useZodForm({
    schema: createListingSchema,
    values,
    submit,
    onSuccess,
  });

  const perBed = listingType === "bedspace";

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? <Alert>{formError}</Alert> : null}

      <TextField
        label="Title"
        name="title"
        value={title}
        onChange={setTitle}
        error={errors.title}
        placeholder="Studio near Katipunan"
        hint="What a renter would recognise it by."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Property type"
          name="propertyType"
          value={propertyType}
          onChange={setPropertyType}
          error={errors.propertyType}
          options={PROPERTY_TYPES}
          hint="What the building is."
        />
        <SelectField
          label="What you're renting out"
          name="listingType"
          value={listingType}
          onChange={setListingType}
          error={errors.listingType}
          options={LISTING_TYPES}
          hint="A bedspace is priced per bed."
        />
      </div>

      <TextField
        label="Address"
        name="address"
        value={address}
        onChange={setAddress}
        error={errors.address}
        placeholder="12 Esteban Abada St"
        hint="You'll pin the exact spot on a map next."
      />

      <NumberField
        label={perBed ? "Rent per bed" : "Monthly rent"}
        name="rent"
        value={rent}
        onChange={setRent}
        error={errors.rent}
        prefix="₱"
        suffix="/mo"
        placeholder="18000"
        required
      />

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save draft and continue"}
      </Button>
    </form>
  );
}

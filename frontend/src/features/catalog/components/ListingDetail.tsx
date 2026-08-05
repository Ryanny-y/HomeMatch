import Link from "next/link";
import type { IconType } from "react-icons";
import {
  PiArrowLeft,
  PiBathtub,
  PiBed,
  PiCar,
  PiCouch,
  PiDog,
  PiHouseLine,
  PiLightning,
  PiMapPinLine,
  PiSnowflake,
  PiUsersThree,
} from "react-icons/pi";
import type { CatalogListingDto } from "@homematch/shared";
import { Container } from "@/components/ui/Section";
import { CostPanel } from "@/features/catalog/components/CostPanel";
import { ListingPhoto } from "@/features/catalog/components/ListingPhoto";
import { listedAgo, placeOf } from "@/features/catalog/listing-facts";

/**
 * A published listing, as a renter sees it.
 *
 * No map and no commute figures. The coordinates exist, but a map is a new
 * dependency and `ListingCommute` ships empty until the routing job in Stage 4
 * — and a "12 minutes to Cubao" with nothing behind it is exactly the invented
 * number this product refuses. The address and barangay are shown instead,
 * which are facts.
 */

const PROPERTY_LABEL: Record<CatalogListingDto["propertyType"], string> = {
  condo: "Condominium",
  apartment: "Apartment",
  boarding_house: "Boarding house",
};

export function ListingDetail({ listing }: { listing: CatalogListingDto }) {
  const [cover, ...rest] = listing.images;

  return (
    <main id="main" className="bg-canvas py-8 sm:py-12">
      <Container>
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand hover:text-brand-dark"
        >
          <PiArrowLeft aria-hidden className="h-4 w-4" />
          All listings
        </Link>

        {/*
         * Height-capped rather than a fixed aspect ratio. 16:9 across a 1088px
         * container is a 612px photo, which pushed the cost panel — the reason
         * this page exists — off the first screen entirely. The clamp keeps the
         * photo generous on a phone and stops it eating the fold on a desktop:
         * 416px at desktop still leaves the cost panel's heading above it.
         */}
        <ListingPhoto
          image={cover}
          alt={listing.title}
          sizes="(min-width: 1152px) 64rem, 96vw"
          priority
          className="mt-5 h-[clamp(15rem,36vw,26rem)]"
        />

        {rest.length > 0 ? (
          <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {rest.map((image) => (
              <li key={image.id}>
                <ListingPhoto
                  image={image}
                  alt={`${listing.title}, another view`}
                  sizes="(min-width: 640px) 10rem, 22vw"
                  className="aspect-square"
                />
              </li>
            ))}
          </ul>
        ) : null}

        <header className="mt-8 max-w-3xl">
          <p className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.12em] text-ink-muted uppercase">
            <PiMapPinLine aria-hidden className="h-4 w-4" />
            {placeOf(listing)}
          </p>
          <h1 className="mt-3 text-[clamp(1.625rem,3.2vw,2.25rem)]">{listing.title}</h1>
          <p className="mt-3 text-ink-muted">
            {listing.address} · {listedAgo(listing.publishedAt).toLowerCase()}
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="flex flex-col gap-6">
            <CostPanel listing={listing} />

            {listing.description ? (
              <section
                aria-labelledby="about-heading"
                className="rounded-card bg-surface p-6 shadow-card sm:p-7"
              >
                <h2 id="about-heading" className="text-xl">
                  About this place
                </h2>
                <p className="mt-3 leading-[1.7] whitespace-pre-line text-ink-soft">
                  {listing.description}
                </p>
              </section>
            ) : null}

            {listing.walkabilityNote ? (
              <section
                aria-labelledby="area-heading"
                className="rounded-card bg-surface p-6 shadow-card sm:p-7"
              >
                <h2 id="area-heading" className="text-xl">
                  Getting around
                </h2>
                <p className="mt-3 leading-[1.7] text-ink-soft">
                  {listing.walkabilityNote}
                </p>
              </section>
            ) : null}
          </div>

          <AtAGlance listing={listing} />
        </div>
      </Container>
    </main>
  );
}

type Spec = { key: string; icon: IconType; label: string; value: string };

/**
 * The specification panel.
 *
 * Every row is a column that is actually set. A null bedroom count on a
 * bedspace is not "0 bedrooms", it means the unit of sale is a bed, so the row
 * is absent rather than zeroed.
 */
function AtAGlance({ listing }: { listing: CatalogListingDto }) {
  const specs: Spec[] = [
    { key: "type", icon: PiHouseLine, label: "Property", value: PROPERTY_LABEL[listing.propertyType] },
    {
      key: "sale",
      icon: PiUsersThree,
      label: "Renting",
      value: listing.listingType === "bedspace" ? "A bedspace" : "The whole unit",
    },
  ];

  if (listing.bedrooms !== null) {
    specs.push({
      key: "beds",
      icon: PiBed,
      label: "Bedrooms",
      value: String(listing.bedrooms),
    });
  }

  if (listing.bathrooms !== null) {
    specs.push({
      key: "baths",
      icon: PiBathtub,
      label: "Bathrooms",
      value: String(listing.bathrooms),
    });
  }

  if (listing.bathroomAccess) {
    specs.push({
      key: "bath-access",
      icon: PiBathtub,
      label: "Bathroom",
      value: listing.bathroomAccess === "private" ? "Private" : "Shared",
    });
  }

  specs.push(
    {
      key: "furnished",
      icon: PiCouch,
      label: "Furnished",
      value: listing.furnished ? "Yes" : "No",
    },
    {
      key: "aircon",
      icon: PiSnowflake,
      label: "Air conditioning",
      value: listing.aircon ? "Yes" : "No",
    },
    {
      key: "utilities",
      icon: PiLightning,
      label: "Utilities included",
      value: listing.utilitiesIncluded ? "Yes" : "No",
    },
    {
      key: "parking",
      icon: PiCar,
      label: "Parking",
      value: listing.parkingAvailable ? "Available" : "None",
    },
    {
      key: "pets",
      icon: PiDog,
      label: "Pets",
      value: listing.petsAllowed ? "Allowed" : "Not allowed",
    },
  );

  if (listing.curfew) {
    specs.push({ key: "curfew", icon: PiHouseLine, label: "Curfew", value: listing.curfew });
  }

  return (
    <section
      aria-labelledby="specs-heading"
      className="rounded-card bg-surface p-6 shadow-card lg:sticky lg:top-24"
    >
      <h2 id="specs-heading" className="text-xl">
        At a glance
      </h2>
      <dl className="mt-4">
        {specs.map((spec) => (
          <div
            key={spec.key}
            className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-0 last:pb-0"
          >
            <dt className="flex items-center gap-2.5 text-[0.875rem] text-ink-muted">
              <spec.icon aria-hidden className="h-[1.0625rem] w-[1.0625rem] shrink-0 text-ink-faint" />
              {spec.label}
            </dt>
            <dd data-figure className="text-[0.875rem] font-semibold text-ink">
              {spec.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

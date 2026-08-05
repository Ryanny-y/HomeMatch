import Image from "next/image";
import { PiImageSquare } from "react-icons/pi";
import type { ListingImageDto } from "@homematch/shared";

/**
 * A listing's cover photo, inset within the card rather than bled to its edge.
 *
 * The empty state is a composed frame rather than a failed image element: a
 * listing cannot be published without at least one photo
 * (`findReadinessGaps`), so this branch only runs if an object goes missing
 * from storage — which is exactly the case where a torn-image glyph would read
 * as the whole site being broken rather than one file.
 */
export function ListingPhoto({
  image,
  alt,
  sizes,
  priority = false,
  className,
}: {
  image: ListingImageDto | undefined;
  /** What the photo shows — the listing title, not "listing photo". */
  alt: string;
  sizes: string;
  /** Set on the first row of cards, and on the detail page's hero. */
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[0.625rem] bg-surface-sunken ${className ?? ""}`}
    >
      {image ? (
        <Image
          src={image.url}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <PiImageSquare aria-hidden className="h-8 w-8 text-ink-faint" />
          <span className="sr-only">No photo for this listing</span>
        </div>
      )}
    </div>
  );
}

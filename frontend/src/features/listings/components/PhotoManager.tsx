"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { PiStar, PiStarFill, PiTrash, PiUploadSimple } from "react-icons/pi";
import { Alert } from "@/components/ui/Alert";
import type { Listing } from "@/features/listings/api/listings.api";
import {
  useDeleteImage,
  useMakeImagePrimary,
  useUploadImage,
} from "@/features/listings/hooks/useListings";

const ACCEPTED = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Photos, uploaded straight to storage from the browser.
 *
 * Size is checked here as well as server-side because the point of a client
 * check is to fail before an 8MB phone photo has crossed a mobile connection —
 * not to be trusted.
 */
export function PhotoManager({ listing }: { listing: Listing }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useUploadImage(listing.id);
  const remove = useDeleteImage(listing.id);
  const promote = useMakeImagePrimary(listing.id);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setError(null);

    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is over 8MB. Try a smaller version.`);
        continue;
      }

      try {
        await upload.mutateAsync(file);
      } catch (thrown) {
        setError(thrown instanceof Error ? thrown.message : "That photo didn't upload.");
      }
    }

    if (input.current) input.current.value = "";
  }

  return (
    <div>
      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {listing.images.length > 0 ? (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {listing.images.map((image) => (
            <li
              key={image.id}
              className="group relative aspect-4/3 overflow-hidden rounded-card border border-line bg-surface-sunken"
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 200px"
                className="object-cover"
                unoptimized
              />

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/70 p-1.5">
                <button
                  type="button"
                  onClick={() => promote.mutate(image.id)}
                  disabled={image.isPrimary}
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-chip px-2 text-white transition-colors hover:bg-white/15 disabled:opacity-60"
                >
                  {image.isPrimary ? (
                    <PiStarFill aria-hidden size={16} className="text-gold" />
                  ) : (
                    <PiStar aria-hidden size={16} />
                  )}
                  <span className="sr-only">
                    {image.isPrimary ? "Cover photo" : "Make this the cover photo"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => remove.mutate(image.id)}
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-chip px-2 text-white transition-colors hover:bg-danger"
                >
                  <PiTrash aria-hidden size={16} />
                  <span className="sr-only">Remove this photo</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        multiple
        onChange={(event) => void onPick(event.target.files)}
        className="sr-only"
        id="listing-photos"
      />
      <label
        htmlFor="listing-photos"
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-chip border border-line-strong bg-surface px-5 font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
      >
        <PiUploadSimple aria-hidden size={18} />
        {upload.isPending ? "Uploading…" : "Add photos"}
      </label>

      <p className="mt-2 text-[0.8125rem] text-ink-muted">
        JPEG, PNG or WebP, up to 8MB each. The starred photo is what renters see
        first.
      </p>
    </div>
  );
}

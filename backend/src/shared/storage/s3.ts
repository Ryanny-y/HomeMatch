import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

/**
 * Object storage, one client.
 *
 * MinIO locally, S3 or R2 in production — only the endpoint and credentials
 * differ. `forcePathStyle` is required for MinIO, which has no per-bucket DNS.
 */
const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

const UPLOAD_URL_TTL_SECONDS = 300;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type PresignedUpload = {
  uploadUrl: string;
  storageKey: string;
};

/**
 * A short-lived URL the browser PUTs directly to.
 *
 * Image bytes never pass through the API process — a listing photo from a phone
 * camera is several megabytes, and proxying those would tie up a request worker
 * per upload for no benefit.
 *
 * The key is server-generated. Letting the client name it would let one landlord
 * overwrite another's photo by guessing a path.
 */
export async function presignListingUpload(
  listingId: string,
  contentType: string,
): Promise<PresignedUpload> {
  const extension = EXTENSION_BY_TYPE[contentType] ?? "bin";
  const storageKey = `listings/${listingId}/${randomUUID()}.${extension}`;

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: storageKey,
      ContentType: contentType,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );

  return { uploadUrl, storageKey };
}

/** Public read URL. Swapped for a CDN origin in production without touching rows. */
export function publicUrlFor(storageKey: string): string {
  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${storageKey}`;
}

/**
 * Best-effort delete.
 *
 * A failure here leaves an orphaned object, which costs storage but breaks
 * nothing. Failing the request instead would leave the row pointing at an image
 * the user already believes is gone — the worse of the two.
 */
export async function deleteObject(storageKey: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: storageKey }),
  );
}

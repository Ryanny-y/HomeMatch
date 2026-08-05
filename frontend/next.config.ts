import type { NextConfig } from "next";

/**
 * Where listing photos are served from.
 *
 * The API returns absolute image URLs built from its own `S3_ENDPOINT` and
 * `S3_BUCKET` (see `publicUrlFor` in the backend), so the host differs by
 * environment — MinIO on `:9000` locally, S3 or a CDN in production.
 * `next/image` refuses to load any remote host it was not told about, so the
 * host is read from configuration rather than hardcoded here.
 *
 * Read at build time on the server, so it needs no `NEXT_PUBLIC_` prefix.
 */
const MEDIA_ORIGIN = process.env.MEDIA_ORIGIN ?? "http://localhost:9000";

const media = new URL(MEDIA_ORIGIN);

/**
 * Next 16 refuses to optimise an upstream image whose host resolves to a
 * private or loopback address, because an optimiser that will fetch anything is
 * a server-side request forgery primitive. MinIO in development is exactly that
 * — `localhost:9000` — so local photos 400 without an explicit opt-out.
 *
 * The opt-out is therefore derived from the configured host rather than from
 * `NODE_ENV`: a production `MEDIA_ORIGIN` points at S3 or a CDN, so this
 * evaluates false there on its own. Setting it from the environment name would
 * leave one mis-set variable between a deployment and an open proxy.
 */
const MEDIA_IS_LOCAL = /^(localhost|127\.|0\.0\.0\.0$|\[?::1\]?$|192\.168\.|10\.)/.test(
  media.hostname,
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: media.protocol === "https:" ? "https" : "http",
        hostname: media.hostname,
        port: media.port,
        pathname: "/**",
      },
    ],
    dangerouslyAllowLocalIP: MEDIA_IS_LOCAL,
  },
};

export default nextConfig;

import { ImageResponse } from "next/og";

/**
 * Social card. Built from the same object the page opens on — a cost breakdown
 * closing on a true monthly cost — because that image is the pitch, and a
 * shared link should carry the argument rather than a logo on a gradient.
 *
 * The composition bar uses the same category colours as the site, so the card
 * and the page are recognisably the same product.
 *
 * ---
 *
 * A NOTE ON THE `tw` PROP — read before editing.
 *
 * This is the one file in the app whose classes are NOT our Tailwind. Satori
 * (which renders this to PNG) ships its own miniature Tailwind and reads it
 * from `tw`, not `className`. Two consequences that will bite:
 *
 * 1. It cannot see `@theme` in `globals.css`, so there is no `bg-canvas` or
 *    `text-ink` here. Colours are literal, interpolated from the constants
 *    below so the palette still has one source.
 * 2. Nothing in this file is scanned by the Tailwind compiler, so the usual
 *    ban on building class names by interpolation does not apply — `tw` is
 *    parsed at render time, from the finished string.
 *
 * It also implements a subset. If a utility silently does nothing, express
 * that one declaration through `style` instead (`style` wins over `tw`), and
 * say why in a comment. Two are already known to be missing, both verified by
 * rendering the card and diffing the PNG: `gap-*` is ignored outright, and
 * `flex-[1.05]` pushes the card off the canvas entirely. Every `gap` and
 * `flex` below is therefore set through `style`, and moving either back to
 * `tw` breaks the image silently — no error, just a wrong card.
 */

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "HomeMatch AI — find the right home, not just another listing. An example breakdown showing an advertised rent of ₱22,000 against a true monthly cost of ₱34,499.";

const CANVAS = "#F8FAFC";
const SURFACE = "#FFFFFF";
const INK = "#0F172A";
const MUTED = "#475569";
const LINE = "#E2E8F0";
const BRAND = "#2563EB";
const DANGER = "#DC2626";

const SEGMENTS = [
  { color: "#2563EB", share: 63.8 },
  { color: "#7C3AED", share: 7.2 },
  { color: "#F59E0B", share: 10.1 },
  { color: "#0891B2", share: 4.9 },
  { color: "#E11D48", share: 3.5 },
  { color: "#EA580C", share: 10.4 },
];

function Line({
  label,
  amount,
  color,
}: {
  label: string;
  amount: string;
  color: string;
}) {
  return (
    <div
      tw={`flex items-center mb-3.5 border-b border-[${LINE}] pb-3.5 text-[26px]`}
      style={{ gap: 12 }}
    >
      <div tw={`h-3 w-3 rounded-full bg-[${color}]`} />
      <div tw={`flex flex-1 text-[${MUTED}]`}>{label}</div>
      <div tw={`flex font-semibold text-[${INK}]`}>{amount}</div>
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        tw={`flex h-full w-full bg-[${CANVAS}] p-[72px] text-[${INK}]`}
        style={{ gap: 56 }}
      >
        {/* The two columns are 1.05 / 0.95 rather than even: the headline wants
            the extra line-length, and the card is denser than it looks. */}
        <div tw="flex flex-col justify-between" style={{ flex: 1.05 }}>
          <div tw="flex flex-col">
            <div tw="flex items-center" style={{ gap: 14 }}>
              <div tw={`h-11 w-11 rounded-xl bg-[${BRAND}]`} />
              <div tw="flex text-[28px] font-bold">HomeMatch AI</div>
            </div>

            <div tw="flex mt-10 text-[70px] font-extrabold leading-[1.05] tracking-[-2.5px]">
              Find the right home, not just another listing.
            </div>
          </div>

          <div tw={`flex text-[25px] leading-[1.4] text-[${MUTED}]`}>
            Match scores, true monthly cost, and side-by-side comparisons for
            Quezon City.
          </div>
        </div>

        <div
          tw={`flex flex-col justify-center rounded-[18px] border border-[${LINE}] bg-[${SURFACE}] p-10`}
          style={{ flex: 0.95 }}
        >
          <div tw="flex items-center justify-between">
            <div tw={`flex text-[20px] tracking-[1.5px] text-[${MUTED}]`}>
              SIKATUNA VILLAGE, QC
            </div>
            <div tw="flex items-center rounded-full bg-[#FEF3C7] px-3.5 py-1.5 text-[20px] font-bold text-[#B45309]">
              94 MATCH
            </div>
          </div>

          {/* Composition bar — rent is only ~64% of the real cost. */}
          <div tw="flex mt-[26px]" style={{ gap: 3 }}>
            {SEGMENTS.map((segment) => (
              <div
                key={segment.color}
                tw={`h-3.5 w-[${segment.share}%] rounded-full bg-[${segment.color}]`}
              />
            ))}
          </div>

          <div tw="flex flex-col mt-[30px]">
            <Line label="Rent" amount="₱22,000" color={SEGMENTS[0].color} />
            <Line
              label="Everything else"
              amount="₱12,499"
              color={SEGMENTS[2].color}
            />
          </div>

          <div
            tw={`flex items-center justify-between rounded-xl bg-[${INK}] px-[22px] py-[18px] text-[${SURFACE}]`}
          >
            <span tw="text-[19px] tracking-[1.5px]">TRUE MONTHLY COST</span>
            <span tw="text-[46px] font-extrabold tracking-[-1.5px]">
              ₱34,499
            </span>
          </div>

          <div tw={`flex mt-[22px] text-[22px] text-[${DANGER}]`}>
            ₱12,499 more than the ad — 57% above.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

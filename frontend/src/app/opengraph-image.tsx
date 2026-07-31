import { ImageResponse } from "next/og";

/**
 * Social card. Built from the same object the page opens on — a cost breakdown
 * closing on a true monthly cost — because that image is the pitch, and a
 * shared link should carry the argument rather than a logo on a gradient.
 *
 * The composition bar uses the same category colours as the site, so the card
 * and the page are recognisably the same product.
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderBottom: `1px solid ${LINE}`,
        paddingBottom: 14,
        marginBottom: 14,
        fontSize: 26,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      <div style={{ display: "flex", flex: 1, color: MUTED }}>{label}</div>
      <div style={{ display: "flex", color: INK, fontWeight: 600 }}>{amount}</div>
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: CANVAS,
          color: INK,
          padding: 72,
          gap: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1.05,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: BRAND,
                }}
              />
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>
                HomeMatch AI
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: 70,
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: -2.5,
                marginTop: 40,
              }}
            >
              Find the right home, not just another listing.
            </div>
          </div>

          <div style={{ display: "flex", fontSize: 25, color: MUTED, lineHeight: 1.4 }}>
            Match scores, true monthly cost, and side-by-side comparisons for
            Quezon City.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 0.95,
            backgroundColor: SURFACE,
            border: `1px solid ${LINE}`,
            borderRadius: 18,
            padding: 40,
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 20, letterSpacing: 1.5, color: MUTED }}>
              SIKATUNA VILLAGE, QC
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#FEF3C7",
                color: "#B45309",
                borderRadius: 999,
                padding: "6px 14px",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              94 MATCH
            </div>
          </div>

          {/* Composition bar — rent is only ~64% of the real cost. */}
          <div style={{ display: "flex", gap: 3, marginTop: 26 }}>
            {SEGMENTS.map((segment) => (
              <div
                key={segment.color}
                style={{
                  display: "flex",
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: segment.color,
                  width: `${segment.share}%`,
                }}
              />
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
            <Line label="Rent" amount="₱22,000" color={SEGMENTS[0].color} />
            <Line label="Everything else" amount="₱12,499" color={SEGMENTS[2].color} />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: INK,
              borderRadius: 12,
              padding: "18px 22px",
              color: SURFACE,
            }}
          >
            <span style={{ fontSize: 19, letterSpacing: 1.5 }}>TRUE MONTHLY COST</span>
            <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1.5 }}>
              ₱34,499
            </span>
          </div>

          <div style={{ display: "flex", marginTop: 22, fontSize: 22, color: DANGER }}>
            ₱12,499 more than the ad — 57% above.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

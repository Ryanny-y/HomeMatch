"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodePrecision } from "@homematch/shared";

/**
 * Confirming where the unit actually is.
 *
 * This exists because landlords no longer type commute times — those get
 * computed from these coordinates, which makes the pin load-bearing. A wrong
 * pin is silent: nothing downstream can tell a rooftop from a barangay
 * centroid, so the landlord confirming it by eye is the check.
 *
 * maplibre is imported dynamically and its CSS injected on mount, so ~200KB of
 * map never reaches a phone that only opened the dashboard. There is no
 * geocoding provider yet, so there is no address autocomplete — the landlord
 * drags the marker. Autocomplete lands with the provider.
 */
const QC_CENTRE = { lng: 121.0437, lat: 14.676 };

export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (next: { lat: number; lng: number; precision: GeocodePrecision }) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    async function mount() {
      try {
        const maplibre = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");

        if (cancelled || !container.current) return;

        const start = lat !== null && lng !== null ? { lat, lng } : QC_CENTRE;

        const map = new maplibre.Map({
          container: container.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          },
          center: [start.lng, start.lat],
          zoom: lat !== null ? 16 : 12,
        });

        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

        const marker = new maplibre.Marker({ draggable: true, color: "#2563eb" })
          .setLngLat([start.lng, start.lat])
          .addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLngLat();
          // Dragged by hand to a visible rooftop — the most precise signal
          // available without a geocoder.
          onChange({ lat: position.lat, lng: position.lng, precision: "rooftop" });
        });

        map.on("click", (event) => {
          marker.setLngLat(event.lngLat);
          onChange({ lat: event.lngLat.lat, lng: event.lngLat.lng, precision: "rooftop" });
        });

        cleanup = () => map.remove();
      } catch {
        // A failed map must not block saving a draft; the fields below still work.
        if (!cancelled) setFailed(true);
      }
    }

    void mount();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Mount once. Re-running on every coordinate change would rebuild the map
    // under the user's finger mid-drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <p className="rounded-chip border border-gold-line bg-gold-soft px-3.5 py-3 text-[0.875rem] text-gold-ink">
        The map didn&rsquo;t load. You can still save this listing — set the pin
        later so renters can work out the commute.
      </p>
    );
  }

  return (
    <div>
      <div
        ref={container}
        role="application"
        aria-label="Drag the marker to the building's exact location"
        className="h-64 w-full overflow-hidden rounded-card border border-line-strong bg-surface-sunken sm:h-80"
      />
      <p className="mt-2 text-[0.8125rem] leading-snug text-ink-muted">
        Drag the marker, or tap the map, to mark the exact building.{" "}
        {lat !== null && lng !== null ? (
          <span className="font-mono tabular-nums text-ink-soft">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        ) : (
          <span className="text-gold-ink">Not set yet.</span>
        )}
      </p>
    </div>
  );
}

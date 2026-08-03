"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodePrecision } from "@homematch/shared";

/**
 * Confirming where the unit actually is.
 *
 * This is load-bearing: landlords no longer type commute times, those get
 * computed from these coordinates. A wrong pin is silent — nothing downstream
 * can tell a rooftop from a barangay centroid — so the landlord seeing it on a
 * map is the check.
 *
 * mapbox-gl is imported dynamically with its CSS, so ~250KB of map never
 * reaches a phone that only opened the dashboard.
 *
 * The map is created once and afterwards driven through refs. Re-running the
 * setup effect on every coordinate change would rebuild it under the user's
 * finger mid-drag, which is the bug the empty dependency list is guarding
 * against — `target` moves the existing marker instead.
 */
const QC_CENTRE = { lng: 121.0437, lat: 14.676 };
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

type MapboxMap = { flyTo: (options: unknown) => void; remove: () => void };
type MapboxMarker = { setLngLat: (position: [number, number]) => MapboxMarker };

export function LocationPicker({
  lat,
  lng,
  target,
  pending = false,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  /** A geocoded hit to move the pin to. Identity change is the signal, so the
   *  same coordinates arriving twice still re-centres. */
  target?: { lat: number; lng: number } | null;
  pending?: boolean;
  onChange: (next: { lat: number; lng: number; precision: GeocodePrecision }) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const marker = useRef<MapboxMarker | null>(null);
  const [failed, setFailed] = useState(false);

  // Held in a ref so the setup effect never needs it as a dependency — a new
  // callback identity each render must not tear down and rebuild the map.
  const emit = useRef(onChange);
  useEffect(() => {
    emit.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!TOKEN) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    async function mount() {
      try {
        const mapbox = await import("mapbox-gl");
        await import("mapbox-gl/dist/mapbox-gl.css");

        if (cancelled || !container.current) return;

        const gl = mapbox.default;
        gl.accessToken = TOKEN as string;

        const start = lat !== null && lng !== null ? { lat, lng } : QC_CENTRE;

        const instance = new gl.Map({
          container: container.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [start.lng, start.lat],
          zoom: lat !== null ? 16 : 12,
        });

        instance.addControl(new gl.NavigationControl({ showCompass: false }), "top-right");

        const pin = new gl.Marker({ draggable: true, color: "#2563eb" })
          .setLngLat([start.lng, start.lat])
          .addTo(instance);

        pin.on("dragend", () => {
          const position = pin.getLngLat();
          // Placed by hand on a visible rooftop. This outranks anything a
          // geocoder returns, which is why an address edit later offers rather
          // than overwrites.
          emit.current({ lat: position.lat, lng: position.lng, precision: "rooftop" });
        });

        instance.on("click", (event) => {
          pin.setLngLat(event.lngLat);
          emit.current({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
            precision: "rooftop",
          });
        });

        map.current = instance as unknown as MapboxMap;
        marker.current = pin as unknown as MapboxMarker;

        cleanup = () => {
          instance.remove();
          map.current = null;
          marker.current = null;
        };
      } catch {
        // A failed map must not block saving a draft; the fields still work.
        if (!cancelled) setFailed(true);
      }
    }

    void mount();

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!target || !map.current || !marker.current) return;

    marker.current.setLngLat([target.lng, target.lat]);
    map.current.flyTo({ center: [target.lng, target.lat], zoom: 17, duration: 900 });
  }, [target]);

  if (!TOKEN) {
    return (
      <p className="rounded-chip border border-gold-line bg-gold-soft px-3.5 py-3 text-[0.875rem] leading-relaxed text-gold-ink">
        The map needs a Mapbox token. Set{" "}
        <code className="font-mono text-[0.8125rem]">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
        <code className="font-mono text-[0.8125rem]">frontend/.env.local</code> and reload.
        You can still save this listing without it.
      </p>
    );
  }

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
      <div className="relative">
        <div
          ref={container}
          role="application"
          aria-label="Drag the marker to the building's exact location"
          className="h-64 w-full overflow-hidden rounded-card border border-line-strong bg-surface-sunken sm:h-80"
        />
        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-card bg-ink/25">
            <span className="rounded-chip bg-surface px-3 py-1.5 text-[0.8125rem] font-semibold text-ink shadow-card">
              Finding that address…
            </span>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[0.8125rem] leading-snug text-ink-muted">
        Drag the marker, or tap the map, to mark the exact building.{" "}
        {lat !== null && lng !== null ? (
          <span data-figure className="text-ink-soft">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        ) : (
          <span className="text-gold-ink">Not set yet.</span>
        )}
      </p>
    </div>
  );
}

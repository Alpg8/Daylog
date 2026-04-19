"use client";

// This file is dynamically imported (no SSR) to avoid window/document issues
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface VehicleLocation {
  id: string;
  plateNumber: string;
  brand: string | null;
  model: string | null;
  status: string;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: string | null;
  drivers: { fullName: string }[];
}

const MARKER_COLORS: Record<string, string> = {
  ON_ROUTE: "#ef4444",
  AVAILABLE: "#22c55e",
  MAINTENANCE: "#f97316",
  PASSIVE: "#6b7280",
};

const STATUS_LABELS: Record<string, string> = {
  ON_ROUTE: "Rotada",
  AVAILABLE: "Müsait",
  MAINTENANCE: "Bakımda",
  PASSIVE: "Pasif",
};

function makeIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    html: `
      <div style="
        display:flex;flex-direction:column;align-items:center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      ">
        <div style="
          background:${color};
          color:#fff;
          font-size:9px;
          font-weight:700;
          font-family:monospace;
          padding:3px 5px;
          border-radius:4px;
          white-space:nowrap;
          line-height:1.2;
          border:1.5px solid rgba(255,255,255,0.3);
          max-width:72px;
          overflow:hidden;
          text-overflow:ellipsis;
        ">${label}</div>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid ${color};
        "></div>
      </div>
    `,
    iconSize: [80, 46],
  });
}

interface Props {
  vehicles: VehicleLocation[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export default function FleetLeafletMap({ vehicles, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    // CartoDB Dark Matter tiles (no API key needed)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when vehicles change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const newIds = new Set(vehicles.map((v) => v.id));

    // Remove stale markers
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    }

    const bounds: [number, number][] = [];

    for (const v of vehicles) {
      if (!v.lastLat || !v.lastLng) continue;

      const color = MARKER_COLORS[v.status] ?? "#6b7280";
      const label = v.plateNumber;
      const icon = makeIcon(color, label);
      const latlng: [number, number] = [v.lastLat, v.lastLng];
      bounds.push(latlng);

      const driverName = v.drivers[0]?.fullName ?? "";
      const statusLabel = STATUS_LABELS[v.status] ?? v.status;

      const popupContent = `
        <div style="font-family:monospace;min-width:140px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${v.plateNumber}</div>
          ${v.brand || v.model ? `<div style="font-size:11px;opacity:0.7;margin-bottom:2px">${[v.brand, v.model].filter(Boolean).join(" ")}</div>` : ""}
          ${driverName ? `<div style="font-size:11px;margin-bottom:2px">👤 ${driverName}</div>` : ""}
          <div style="font-size:11px">
            <span style="background:${color};color:#fff;padding:1px 5px;border-radius:3px;">${statusLabel}</span>
          </div>
        </div>
      `;

      if (markersRef.current.has(v.id)) {
        const marker = markersRef.current.get(v.id)!;
        marker.setLatLng(latlng);
        marker.setIcon(icon);
        marker.getPopup()?.setContent(popupContent);
      } else {
        const marker = L.marker(latlng, { icon })
          .addTo(map)
          .bindPopup(popupContent, { maxWidth: 200 });

        marker.on("click", () => onSelect(v.id));
        markersRef.current.set(v.id, marker);
      }
    }

    if (bounds.length > 0 && markersRef.current.size > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      } catch {
        // ignore
      }
    }
  }, [vehicles, onSelect]);

  // Pan to selected vehicle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected) return;
    const marker = markersRef.current.get(selected);
    if (marker) {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 10), { animate: true });
      marker.openPopup();
    }
  }, [selected]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      className="rounded-bl-xl [&_.leaflet-attribution-flag]:hidden"
    />
  );
}

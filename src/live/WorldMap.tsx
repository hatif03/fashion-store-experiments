import * as React from "react";
import { geoContains, geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

export interface Place {
  city: string | null;
  country: string | null;
  lat: number;
  lon: number;
  visitors: number;
}

export interface Ping {
  id: string;
  lat: number;
  lon: number;
  strong: boolean;
}

const WIDTH = 1000;
const HEIGHT = 500;

const topology = world as unknown as Topology<{ countries: GeometryCollection }>;
const COUNTRIES = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry>).features.filter(
  // Antarctica takes a fifth of the frame and nobody shops from it.
  (country) => country.id !== "010",
);
const projection = geoNaturalEarth1().fitExtent(
  [
    [8, 8],
    [WIDTH - 8, HEIGHT - 8],
  ],
  { type: "FeatureCollection", features: COUNTRIES },
);
const path = geoPath(projection);
// A few shapes (Kosovo, Northern Cyprus) carry no ISO id.
const SHAPES = COUNTRIES.map((country, i) => ({ id: country.id === undefined ? `shape-${i}` : String(country.id), d: path(country) ?? "", feature: country }));
const GRATICULE = path(geoGraticule10()) ?? "";
const OUTLINE = path({ type: "Sphere" }) ?? "";

function project(lon: number, lat: number): [number, number] | null {
  return projection([lon, lat]);
}

/** Visitors per country shape, found from where each city falls, so no country-code table is needed. */
function visitorsByShape(places: Place[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const place of places) {
    const shape = SHAPES.find((candidate) => geoContains(candidate.feature as Feature, [place.lon, place.lat]));
    if (shape) totals.set(shape.id, (totals.get(shape.id) ?? 0) + place.visitors);
  }
  return totals;
}

export function WorldMap({ places, pings, className = "" }: { places: Place[]; pings: Ping[]; className?: string }) {
  const totals = React.useMemo(() => visitorsByShape(places), [places]);
  const busiest = Math.max(1, ...totals.values());
  const largest = Math.max(1, ...places.map((place) => place.visitors));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Map of visitors from ${places.length} places`} className={className}>
      <defs>
        <radialGradient id="live-glow">
          <stop offset="0%" stopColor="#f8f6f1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f8f6f1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={OUTLINE} fill="#171614" />
      <path d={GRATICULE} fill="none" stroke="#f8f6f1" strokeOpacity="0.05" strokeWidth="0.6" />
      <g className="live-draw">
        {SHAPES.map((shape) => {
          const count = totals.get(shape.id) ?? 0;
          const share = count ? 0.25 + 0.75 * Math.sqrt(count / busiest) : 0;
          return (
            <path
              key={shape.id}
              d={shape.d}
              fill={count ? `rgb(226 219 206 / ${(0.14 + share * 0.36).toFixed(3)})` : "#252321"}
              stroke="#121110"
              strokeWidth="0.5"
              className="transition-[fill] duration-1000"
            />
          );
        })}
      </g>
      <g>
        {places.map((place, i) => {
          const point = project(place.lon, place.lat);
          if (!point) return null;
          const radius = 1.8 + 4.2 * Math.sqrt(place.visitors / largest);
          return (
            <g key={`${place.city}-${place.country}-${place.lat}-${place.lon}`} transform={`translate(${point[0]} ${point[1]})`}>
              <circle r={radius * 3} fill="url(#live-glow)" opacity="0.18" />
              <circle r={radius} fill="none" stroke="#f8f6f1" strokeWidth="0.8" className="live-ring" style={{ animationDelay: `${(i % 12) * 230}ms` }} />
              <circle r={radius} fill="#f8f6f1" />
            </g>
          );
        })}
      </g>
      <g>
        {pings.map((ping) => {
          const point = project(ping.lon, ping.lat);
          if (!point) return null;
          return (
            <g key={ping.id} transform={`translate(${point[0]} ${point[1]})`}>
              <circle r="4" fill="none" stroke={ping.strong ? "#e8c27a" : "#f8f6f1"} strokeWidth="1.4" className="live-ping" />
              <circle r="2.4" fill={ping.strong ? "#e8c27a" : "#f8f6f1"} className="live-flash" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

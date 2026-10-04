"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";

import type { CountryCode } from "@/lib/domain/schema";
import { useDataset } from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";
import { useMapData } from "./use-map-data";

const W = 960;
const H = 560;
const PURPLE = "#9B7BFF";
// base land: --secondary (#181B21) lightened ~6% so land reads against ocean
const LAND = "#22252A";
const STROKE = "#2a2e36";

// initial view frames N. America + Europe (Singapore via the SG chip)
const VIEW_BBOX: GeoJSON.Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-130, 20],
        [35, 20],
        [35, 72],
        [-130, 72],
        [-130, 20],
      ],
    ],
  },
};

// numeric ISO (world-atlas feature ids) → our codes
const ISO_TO_CODE: Record<string, CountryCode> = {
  "826": "GB",
  "276": "DE",
  "250": "FR",
  "528": "NL",
  "208": "DK",
  "578": "NO",
  "840": "US",
  "702": "SG",
};

type CountryFeature = GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon> & {
  id?: string;
  properties: { name?: string };
};

const world = feature(
  worldAtlas as never,
  (worldAtlas as unknown as { objects: { countries: never } }).objects.countries,
) as unknown as GeoJSON.FeatureCollection;
const countryFeatures = world.features as CountryFeature[];

export function SvgMapView() {
  const dataset = useDataset();
  const data = useMapData();
  const focusedCountry = useWorkspace((s) => s.focusedCountry);
  const focusCountry = useWorkspace((s) => s.focusCountry);
  const selectEntity = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);

  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(
    null,
  );
  const [hovered, setHovered] = useState<string | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });

  const projection = useMemo(
    () => geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], VIEW_BBOX),
    [],
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  const zoomToCode = useCallback(
    (code: CountryCode | null) => {
      const svg = svgRef.current;
      const zm = zoomRef.current;
      if (!svg || !zm) return;
      const sel = select(svg);
      if (!code) {
        sel.transition().duration(600).call(zm.transform as never, zoomIdentity);
        return;
      }
      const iso = Object.entries(ISO_TO_CODE).find(([, c]) => c === code)?.[0];
      const f = countryFeatures.find((x) => String(x.id) === iso);
      if (!f) return;
      const [[x0, y0], [x1, y1]] = path.bounds(f);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const scale = Math.min(6, 0.9 / Math.max(dx / W, dy / H));
      const tx = W / 2 - (scale * (x0 + x1)) / 2;
      const ty = H / 2 - (scale * (y0 + y1)) / 2;
      sel
        .transition()
        .duration(600)
        .call(zm.transform as never, zoomIdentity.translate(tx, ty).scale(scale));
    },
    [path],
  );

  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;
    const zm = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .on("zoom", (e) => {
        select(g).attr("transform", e.transform.toString());
        setTransform({ k: e.transform.k, x: e.transform.x, y: e.transform.y });
      });
    select(svg).call(zm);
    zoomRef.current = zm;
    return () => {
      select(svg).on(".zoom", null);
    };
  }, []);

  // animate to a country focused from elsewhere (graph, AI action)
  const lastFocused = useRef<CountryCode | null>(null);
  useEffect(() => {
    if (focusedCountry !== lastFocused.current) {
      lastFocused.current = focusedCountry;
      zoomToCode(focusedCountry);
    }
  }, [focusedCountry, zoomToCode]);

  const onCountryClick = (code: CountryCode | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!code) return;
    focusCountry(code);
    const jur = dataset.jurisdictions.find(
      (j) => j.country_code === code && (j.level === "NATIONAL" || j.level === "SUPRANATIONAL"),
    );
    if (jur) {
      selectEntity({ kind: "jurisdiction", id: jur.id });
      openPanel("DETAILS");
    }
  };

  const reset = () => {
    focusCountry(null);
    selectEntity(null);
  };

  const focusedData = focusedCountry ? data.countries.get(focusedCountry) : null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0B0C0F]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onClick={() => reset()}
        onMouseLeave={() => setTooltip(null)}
      >
        <g ref={gRef}>
          {countryFeatures.map((f) => {
            const code = ISO_TO_CODE[String(f.id)] as CountryCode | undefined;
            const d = code ? data.countries.get(code) : undefined;
            const dimmed = focusedCountry && code !== focusedCountry;
            const isHovered = code && code === hovered;
            return (
              <path
                key={String(f.id) + (f.properties?.name ?? "")}
                d={path(f) ?? undefined}
                stroke={STROKE}
                strokeWidth={0.5}
                style={{
                  fill: d ? PURPLE : isHovered && code ? "#2a2f38" : LAND,
                  fillOpacity: d ? 0.25 + d.intensity * 0.6 : 1,
                  transition: "fill-opacity 300ms, opacity 300ms, fill 150ms",
                  opacity: dimmed ? 0.5 : 1,
                }}
                data-cc={code}
                className={code ? "cursor-pointer" : undefined}
                onClick={(e) => onCountryClick(code, e)}
                onMouseMove={(e) => {
                  if (!code) return;
                  setHovered(code);
                  const name = d?.name ?? f.properties?.name ?? code;
                  setTooltip({
                    x: e.clientX + 12,
                    y: e.clientY + 12,
                    text: d
                      ? `${name} · ${d.count} relevant ${d.count === 1 ? "policy" : "policies"}`
                      : name,
                  });
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  setTooltip(null);
                }}
              />
            );
          })}
        </g>
        {/* markers live outside the zoomed group so they keep constant size;
            their screen coords follow the same transform */}
        <g>
          {data.markers.map((m) => {
            const pt = projection([m.lng, m.lat]);
            if (!pt) return null;
            const r = 5 + 2.2 * Math.sqrt(m.count);
            const sx = pt[0] * transform.k + transform.x;
            const sy = pt[1] * transform.k + transform.y;
            return (
              <g
                key={m.id}
                transform={`translate(${sx},${sy})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  selectEntity({ kind: "jurisdiction", id: m.jurisdictionId });
                  openPanel("DETAILS");
                }}
                onMouseMove={(e) =>
                  setTooltip({
                    x: e.clientX + 12,
                    y: e.clientY + 12,
                    text: `${m.label} · ${m.count} ${m.count === 1 ? "policy" : "policies"}`,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              >
                <g className="pact-marker">
                <circle
                  r={r}
                  fill={PURPLE}
                  fillOpacity={0.25}
                  stroke={PURPLE}
                  strokeWidth={1.4}
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fontSize={8}
                  fill="#fff"
                  fontFamily="var(--font-mono)"
                >
                  {m.count}
                </text>
                {transform.k >= 2.5 && (
                  <text
                    textAnchor="middle"
                    dy={r + 9}
                    fontSize={7.5}
                    fill="#c9cdd4"
                    fontFamily="var(--font-mono)"
                  >
                    {m.label}
                  </text>
                )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* legend */}
      <div className="glass absolute bottom-3 left-3 z-10 rounded-md px-2.5 py-2">
        <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
          Policies in view
        </div>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-[9px] text-muted-foreground">1</span>
          <div
            className="h-2 w-24 rounded-sm"
            style={{
              background: `linear-gradient(to right, ${PURPLE}40, ${PURPLE}d9)`,
            }}
          />
          <span className="font-mono text-[9px] text-foreground">{data.maxCount}</span>
        </div>
      </div>

      {/* reset + SG */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
        {focusedCountry && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="glass rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-entity-jurisdiction hover:text-foreground"
          >
            ← Reset — {focusedCountry}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            focusCountry("SG");
            const jur = dataset.jurisdictions.find((j) => j.country_code === "SG");
            if (jur) {
              selectEntity({ kind: "jurisdiction", id: jur.id });
              openPanel("DETAILS");
            }
          }}
          className="glass rounded-md px-2 py-1.5 font-mono text-[10px] tracking-wider text-entity-jurisdiction hover:text-foreground"
          title="Focus Singapore"
        >
          SG
        </button>
      </div>

      {/* policies-in-view panel for focused country */}
      {focusedData && (
        <div className="glass absolute right-3 top-3 z-10 w-56 rounded-md p-2.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-entity-jurisdiction">
            {focusedData.name} · {focusedData.count} policies
          </div>
          <ul className="mt-1.5 max-h-44 space-y-0.5 overflow-y-auto scrollbar-thin">
            {focusedData.policies.slice(0, 8).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    selectEntity({ kind: "policy", id: p.id });
                    openPanel("DETAILS");
                  }}
                  className="w-full truncate text-left text-[10.5px] text-foreground hover:text-entity-policy hover:underline"
                >
                  {p.short_name ?? p.name}
                </button>
              </li>
            ))}
            {focusedData.policies.length > 8 && (
              <li className="font-mono text-[9px] text-muted-foreground">
                +{focusedData.policies.length - 8} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* tooltip */}
      {tooltip && (
        <div
          className="glass pointer-events-none fixed z-50 rounded-md px-2 py-1 text-[10.5px] text-foreground"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { useCallback, useEffect, useRef } from "react";

import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import Map, {
  Layer,
  Marker,
  Source,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";

import type { CountryCode } from "@/lib/domain/schema";
import { useDataset } from "@/components/providers/dataset-provider";
import { useWorkspace } from "@/store/workspace";
import type { MapData } from "@/lib/map/map-data";

const PURPLE = "#9B7BFF";

const ISO_TO_CODE: Record<string, CountryCode> = {
  "826": "GB",
  "276": "DE",
  "250": "FR",
  "528": "NL",
  "208": "DK",
  "578": "NO",
  "840": "US",
  "702": "SG",
  "392": "JP",
  "410": "KR",
  "156": "CN",
  "356": "IN",
};

const world = feature(
  worldAtlas as never,
  (worldAtlas as unknown as { objects: { countries: never } }).objects.countries,
) as unknown as GeoJSON.FeatureCollection;

/** Mapbox implementation — only mounted when NEXT_PUBLIC_MAPBOX_TOKEN is set. */
export function MapboxMap({ data }: { data: MapData }) {
  const dataset = useDataset();
  const mapRef = useRef<MapRef>(null);
  const focusedCountry = useWorkspace((s) => s.focusedCountry);
  const focusCountry = useWorkspace((s) => s.focusCountry);
  const select = useWorkspace((s) => s.select);
  const openPanel = useWorkspace((s) => s.openPanel);

  // intensity on each feature for data-driven styling
  const geojson: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: world.features.map((f) => {
      const code = ISO_TO_CODE[String(f.id)];
      const d = code ? data.countries.get(code) : undefined;
      return {
        ...f,
        properties: { ...f.properties, code, intensity: d?.intensity ?? 0, count: d?.count ?? 0 },
      };
    }),
  };

  // fly to focused country
  useEffect(() => {
    if (!focusedCountry) return;
    const f = geojson.features.find(
      (x) => x.properties?.code === focusedCountry,
    );
    if (!f || !mapRef.current) return;
    const flat = (c: unknown): number[] =>
      Array.isArray(c)
        ? typeof c[0] === "number"
          ? (c as number[])
          : c.flatMap(flat)
        : [];
    const nums = "coordinates" in f.geometry ? flat(f.geometry.coordinates) : [];
    let minX = 180, minY = 90, maxX = -180, maxY = -90;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
    }
    mapRef.current.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: 80, duration: 600, maxZoom: 6 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedCountry]);

  const onClick = useCallback(
    (e: MapMouseEvent) => {
      const code = e.features?.[0]?.properties?.code as CountryCode | undefined;
      if (!code) return;
      focusCountry(code);
      const jur = dataset.jurisdictions.find(
        (j) =>
          j.country_code === code &&
          (j.level === "NATIONAL" || j.level === "SUPRANATIONAL"),
      );
      if (jur) {
        select({ kind: "jurisdiction", id: jur.id });
        openPanel("DETAILS");
      }
    },
    [dataset, focusCountry, select, openPanel],
  );

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      projection={{ name: "naturalEarth" }}
      interactiveLayerIds={["countries"]}
      onClick={onClick}
      style={{ width: "100%", height: "100%" }}
    >
      <Source id="countries-src" type="geojson" data={geojson}>
        <Layer
          id="countries"
          type="fill"
          paint={{
            "fill-color": PURPLE,
            "fill-opacity": [
              "case",
              [">", ["get", "intensity"], 0],
              ["+", 0.25, ["*", 0.6, ["get", "intensity"]]],
              0,
            ],
          }}
        />
        <Layer
          id="countries-line"
          type="line"
          paint={{ "line-color": "#262a33", "line-width": 0.5 }}
        />
      </Source>
      {data.markers.map((m) => (
        <Marker key={m.id} latitude={m.lat} longitude={m.lng} anchor="center">
          <button
            type="button"
            onClick={() => {
              select({ kind: "jurisdiction", id: m.jurisdictionId });
              openPanel("DETAILS");
            }}
            className="flex items-center justify-center rounded-full border font-mono text-[8px] text-white"
            style={{
              width: 12 + 4 * Math.sqrt(m.count),
              height: 12 + 4 * Math.sqrt(m.count),
              borderColor: PURPLE,
              backgroundColor: `${PURPLE}40`,
            }}
            title={`${m.label} · ${m.count} policies`}
          >
            {m.count}
          </button>
        </Marker>
      ))}
    </Map>
  );
}

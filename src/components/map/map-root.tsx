"use client";

import { Component, type ReactNode } from "react";

import { MapboxMap } from "./mapbox-map";
import { SvgMapView } from "./map-view";
import { useMapData } from "./use-map-data";

interface BoundaryState {
  failed: boolean;
}

/** Falls back to the SVG map on any Mapbox error. */
class MapErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
     
    console.warn("[pact] Mapbox failed, falling back to SVG map:", err);
  }

  render() {
    return this.state.failed ? <SvgMapView /> : this.props.children;
  }
}

export function MapRoot() {
  const data = useMapData();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return <SvgMapView />;
  return (
    <MapErrorBoundary>
      <MapboxMap data={data} />
    </MapErrorBoundary>
  );
}

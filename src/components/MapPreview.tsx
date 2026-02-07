"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

export type Coordinate = [longitude: number, latitude: number];

export interface MapPreviewProps {
  /** Array of [longitude, latitude] for each city to show as a dot */
  coordinates: Coordinate[];
}

export function MapPreview({ coordinates }: MapPreviewProps) {
  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{
        scale: 147,
        center: [0, 20],
      }}
      width={800}
      height={400}
      style={{ width: "100%", height: "auto" }}
    >
      <Geographies geography={WORLD_ATLAS_URL}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill="#e4e4e7"
              stroke="#a1a1aa"
              strokeWidth={0.5}
            />
          ))
        }
      </Geographies>
      {coordinates.map((coords, index) => (
        <Marker key={`${coords[0]}-${coords[1]}-${index}`} coordinates={coords}>
          <circle r={4} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1} />
        </Marker>
      ))}
    </ComposableMap>
  );
}

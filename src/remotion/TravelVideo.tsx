"use client";

import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import type { Stop } from "@/types/trip";

const WIDTH = 800;
const HEIGHT = 400;
const LINE_GROWTH_FRAMES = 150;

function latLngToXY(lat: number, lng: number): [number, number] {
  const x = ((lng + 180) / 360) * WIDTH;
  const y = (1 - (lat + 90) / 180) * HEIGHT;
  return [x, y];
}

export interface TravelVideoProps {
  stops: Stop[];
}

export function TravelVideo({ stops }: TravelVideoProps) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, LINE_GROWTH_FRAMES], [0, 1], {
    extrapolateRight: "clamp",
  });

  const stopsWithCoords = stops.filter(
    (s): s is Stop & { coordinates: { lat: number; lng: number } } =>
      Boolean(s.coordinates)
  );

  if (stopsWithCoords.length < 2) {
    return (
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          color: "#71717a",
          fontSize: 18,
        }}
      >
        Add at least 2 stops with locations to see the journey.
      </AbsoluteFill>
    );
  }

  const first = stopsWithCoords[0].coordinates!;
  const last = stopsWithCoords[stopsWithCoords.length - 1].coordinates!;
  const [x1, y1] = latLngToXY(first.lat, first.lng);
  const [x2, y2] = latLngToXY(last.lat, last.lng);
  const xEnd = x1 + (x2 - x1) * progress;
  const yEnd = y1 + (y2 - y1) * progress;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#fafafa",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ display: "block" }}
      >
        <line
          x1={x1}
          y1={y1}
          x2={xEnd}
          y2={yEnd}
          stroke="#3b82f6"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={x1} cy={y1} r={6} fill="#1d4ed8" />
        <circle cx={x2} cy={y2} r={6} fill="#1d4ed8" />
      </svg>
    </AbsoluteFill>
  );
}

"use client";

import { useState } from "react";
import { Img, staticFile } from "remotion";

const TRANSPORT_IMAGES: Record<string, string> = {
  plane: staticFile("plane.png"),
  car: staticFile("car.png"),
  train: staticFile("train.png"),
  ship: staticFile("ship.png"),
};

const TRANSPORT_EMOJI: Record<string, string> = {
  plane: "✈️",
  car: "🚗",
  train: "🚂",
  ship: "🚢",
};

export interface TravelHeroProps {
  transportType: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

/**
 * Displays the correct PNG for the transport type (plane.png, car.png, etc.).
 * Falls back to emoji if image is not available.
 */
export function TravelHero({
  transportType,
  width = 48,
  height = 48,
  style = {},
}: TravelHeroProps) {
  const [imgError, setImgError] = useState(false);
  const key =
    transportType?.toLowerCase() in TRANSPORT_IMAGES
      ? transportType.toLowerCase()
      : "plane";
  const src = TRANSPORT_IMAGES[key] ?? TRANSPORT_IMAGES.plane;
  const emoji = TRANSPORT_EMOJI[key] ?? TRANSPORT_EMOJI.plane;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {!imgError ? (
        <Img
          src={src}
          alt={key}
          width={width}
          height={height}
          style={{ objectFit: "contain", display: "block" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span role="img" aria-label={key} style={{ fontSize: width * 0.6 }}>
          {emoji}
        </span>
      )}
    </div>
  );
}

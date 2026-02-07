"use client";

import {
  useCurrentFrame,
  interpolate,
  spring,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { getTotalDistanceMiles, getDaysBetween } from "@/utils/quest-stats";
import { TravelHero } from "@/remotion/TravelHero";
import { CameraFlash } from "@/remotion/components/CameraFlash";
import type { Stop } from "@/types/trip";

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const WIDTH = 800;
const HEIGHT = 400;
const FPS = 30;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

// Intro: character waving at start
const INTRO_FRAMES = 45;
// Segment timeline: per segment = travel + zoom/flash (10) + photo (60 = 2s)
const TRAVEL_FRAMES = 50;
const FLASH_FRAMES = 10;
const PHOTO_FRAMES = 60;
const ARRIVAL_FRAMES = FLASH_FRAMES + PHOTO_FRAMES;
const SEGMENT_FRAMES = TRAVEL_FRAMES + ARRIVAL_FRAMES;
const QUEST_FRAMES = 90;
// Default scenery when user hasn't uploaded a photo for a stop
const DEFAULT_SCENERY = staticFile("default-scenery.png");

const RPG_QUOTES = [
  "The journey changes you. Return with stories worth telling.",
  "Every step was a quest. You are the hero of this tale.",
  "Adventure awaits those who dare. You dared.",
  "From distant lands to memories made—quest complete!",
  "Your map is full of marks. The next chapter awaits.",
];

function latLngToXY(lat: number, lng: number): [number, number] {
  const x = ((lng + 180) / 360) * WIDTH;
  const y = (1 - (lat + 90) / 180) * HEIGHT;
  return [x, y];
}

/** Bearing from (x1,y1) to (x2,y2) in degrees; 0 = right, 90 = down. */
function bearingDeg(x1: number, y1: number, x2: number, y2: number): number {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

/** World map background (same as home page MapPreview). Renders inside transformed div so it pans with the view. */
function WorldMapBackground() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: WIDTH,
        height: HEIGHT,
        zIndex: 0,
      }}
    >
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 147,
          center: [0, 20],
        }}
        width={WIDTH}
        height={HEIGHT}
        style={{ width: WIDTH, height: HEIGHT, display: "block" }}
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
      </ComposableMap>
    </div>
  );
}

export interface TravelVideoProps {
  stops: Stop[];
}

type Phase = "travel" | "zoom" | "photo" | "quest";

function getPhase(
  frame: number,
  segmentCount: number
): {
  phase: Phase;
  segmentIndex: number;
  localFrame: number;
  questStartFrame: number;
} {
  const questStartFrame = INTRO_FRAMES + segmentCount * SEGMENT_FRAMES;
  if (frame >= questStartFrame) {
    return {
      phase: "quest",
      segmentIndex: segmentCount - 1,
      localFrame: frame - questStartFrame,
      questStartFrame,
    };
  }
  const journeyFrame = frame - INTRO_FRAMES;
  const segmentIndex = Math.floor(journeyFrame / SEGMENT_FRAMES);
  const localFrame = journeyFrame - segmentIndex * SEGMENT_FRAMES;
  if (localFrame < TRAVEL_FRAMES) {
    return { phase: "travel", segmentIndex, localFrame, questStartFrame };
  }
  const arrivalLocal = localFrame - TRAVEL_FRAMES;
  if (arrivalLocal < FLASH_FRAMES) {
    return { phase: "zoom", segmentIndex, localFrame, questStartFrame };
  }
  return { phase: "photo", segmentIndex, localFrame, questStartFrame };
}

export function TravelVideo({ stops }: TravelVideoProps) {
  const frame = useCurrentFrame();
  const stopsWithCoords = stops.filter(
    (s): s is Stop & { coordinates: { lat: number; lng: number } } =>
      Boolean(s.coordinates)
  );
  const K = stopsWithCoords.length;
  const segmentCount = Math.max(0, K - 1);
  const isIntro = frame < INTRO_FRAMES;
  const { phase, segmentIndex, localFrame, questStartFrame } = getPhase(
    frame,
    segmentCount
  );

  const totalDistanceMiles = getTotalDistanceMiles(stopsWithCoords);
  const daysElapsed = getDaysBetween(stopsWithCoords);
  const quoteIndex =
    K > 0
      ? (Math.floor(totalDistanceMiles) + daysElapsed) % RPG_QUOTES.length
      : 0;
  const quote = RPG_QUOTES[quoteIndex];

  // Placeholder when fewer than 3 stops (Starting Point + two Destinations)
  if (K < 3) {
    return (
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF5F7",
          color: "#4a3f5c",
          fontSize: 18,
        }}
      >
        Add a Starting Point and two Destinations with locations to see the journey.
      </AbsoluteFill>
    );
  }

  // Intro: character in cute frame waving at start
  if (isIntro) {
    const bob = 4 * Math.sin(frame * 0.25);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#FFF5F7",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div
          style={{
            border: "4px solid #1f2937",
            backgroundColor: "rgba(232, 222, 255, 0.8)",
            padding: 24,
            boxShadow: "6px 6px 0 0 rgba(0,0,0,0.2)",
            textAlign: "center",
          }}
        >
          <div style={{ transform: `translateY(${bob}px)` }}>
            <Img
              src={staticFile("character.png")}
              alt="Character waving"
              width={120}
              height={120}
              style={{ objectFit: "contain", display: "block", margin: "0 auto" }}
            />
          </div>
          <p
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 10,
              color: "#6b21a8",
              marginTop: 16,
            }}
          >
            👋 Let&apos;s go!
          </p>
        </div>
      </AbsoluteFill>
    );
  }

  // Quest Complete (final screen) with character waving at end
  if (phase === "quest") {
    const bob = 4 * Math.sin(localFrame * 0.2);
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#FFF5F7",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 520,
            padding: 32,
            border: "4px solid #1f2937",
            backgroundColor: "rgba(232, 222, 255, 0.6)",
            borderRadius: 8,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 14,
              color: "#6b21a8",
              marginBottom: 24,
            }}
          >
            🏆 QUEST COMPLETE 🏆
          </h2>
          <p
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 10,
              color: "#4a3f5c",
              marginBottom: 12,
            }}
          >
            Total Distance Traveled: {totalDistanceMiles.toFixed(0)} Miles
          </p>
          <p
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 10,
              color: "#4a3f5c",
              marginBottom: 20,
            }}
          >
            Time Elapsed: {daysElapsed} Days
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#6b21a8",
              fontStyle: "italic",
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            &ldquo;{quote}&rdquo;
          </p>
          <div style={{ transform: `translateY(${bob}px)` }}>
            <div
              style={{
                border: "4px solid #1f2937",
                backgroundColor: "rgba(255,255,255,0.9)",
                padding: 12,
                display: "inline-block",
                boxShadow: "4px 4px 0 0 rgba(0,0,0,0.2)",
              }}
            >
              <Img
                src={staticFile("character.png")}
                alt="Character waving"
                width={80}
                height={80}
                style={{ objectFit: "contain", display: "block" }}
              />
              <p
                style={{
                  fontFamily: "var(--font-press-start-2p), monospace",
                  fontSize: 8,
                  color: "#6b21a8",
                  marginTop: 8,
                }}
              >
                👋 Thanks for playing!
              </p>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // Current segment: from stop[segmentIndex] to stop[segmentIndex+1]
  const fromStop = stopsWithCoords[segmentIndex];
  const toStop = stopsWithCoords[segmentIndex + 1];
  const fromCoord = fromStop.coordinates;
  const toCoord = toStop.coordinates;
  const [x1, y1] = latLngToXY(fromCoord.lat, fromCoord.lng);
  const [x2, y2] = latLngToXY(toCoord.lat, toCoord.lng);

  // Travel: line grows, hero moves
  const travelProgress =
    phase === "travel"
      ? interpolate(
          localFrame,
          [0, TRAVEL_FRAMES],
          [0, 1],
          { extrapolateRight: "clamp" }
        )
      : 1;
  const xEnd = x1 + (x2 - x1) * travelProgress;
  const yEnd = y1 + (y2 - y1) * travelProgress;

  // Pan & zoom: during travel center on hero (xEnd, yEnd) so transport stays roughly in center; at arrival zoom onto destination
  const arrivalStartFrame =
    INTRO_FRAMES + segmentIndex * SEGMENT_FRAMES + TRAVEL_FRAMES;
  const zoomLocalFrame = frame - arrivalStartFrame;

  const travelScale = 1.5;
  const arrivalScale = 2.5;
  const travelZoomIn = spring({
    frame: localFrame,
    fps: FPS,
    from: 1,
    to: travelScale,
    durationInFrames: 15,
    config: { damping: 24, mass: 0.6 },
  });
  const scale =
    phase === "travel"
      ? travelZoomIn
      : phase === "zoom"
        ? interpolate(
            zoomLocalFrame,
            [0, FLASH_FRAMES],
            [travelScale, arrivalScale],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          )
        : arrivalScale;

  const centerX =
    phase === "travel"
      ? xEnd
      : phase === "zoom"
        ? interpolate(
            zoomLocalFrame,
            [0, FLASH_FRAMES],
            [xEnd, x2],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          )
        : x2;
  const centerY =
    phase === "travel"
      ? yEnd
      : phase === "zoom"
        ? interpolate(
            zoomLocalFrame,
            [0, FLASH_FRAMES],
            [yEnd, y2],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          )
        : y2;

  const mapTransform = `translate(${CENTER_X}px, ${CENTER_Y}px) scale(${scale}) translate(${-centerX}px, ${-centerY}px)`;

  // Transport for this segment = how the user got TO the destination (toStop), per TripForm chapter transport field
  const currentTransport = (toStop.transport ?? "plane").toLowerCase();
  const destinationIndex = segmentIndex + 1;
  const isArrivingAtStartingPoint = destinationIndex === 0;
  const showFlash = phase === "zoom" && !isArrivingAtStartingPoint;
  const showPhoto = phase === "photo" && !isArrivingAtStartingPoint;
  const photoStop = toStop as Stop & { image?: string };
  const photoSrc = photoStop.image ?? DEFAULT_SCENERY;
  const bearing = bearingDeg(x1, y1, x2, y2);
  // When traveling left (bearing in left hemisphere), flip horizontally and rotate so the icon stays right-side up
  const isLeftHemisphere =
    (bearing > 90 && bearing <= 180) || (bearing >= -180 && bearing < -90);
  const rotationDeg = isLeftHemisphere ? bearing - 180 : bearing;
  const scaleX = isLeftHemisphere ? -1 : 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFF5F7",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Map background + route: pan & zoom so current segment / destination is centered */}
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          position: "relative",
          transform: mapTransform,
          transformOrigin: "0 0",
        }}
      >
        <WorldMapBackground />
        <svg
          width={WIDTH}
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ display: "block", position: "relative", zIndex: 1 }}
        >
          <line
            x1={x1}
            y1={y1}
            x2={xEnd}
            y2={yEnd}
            stroke="#9B7EDE"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={x1} cy={y1} r={6} fill="#6b21a8" />
          <circle cx={x2} cy={y2} r={6} fill="#6b21a8" />
        </svg>
        {/* Hero: only during travel or zoom (first moment), not during photo; gentle 5px float + face direction */}
        {(phase === "travel" || (phase === "zoom" && zoomLocalFrame < 2)) && (
          <div
            style={{
              position: "absolute",
              left: Math.max(0, Math.min(WIDTH - 48, xEnd - 24)),
              top: Math.max(0, Math.min(HEIGHT - 48, yEnd - 24)),
              pointerEvents: "none",
              zIndex: 2,
              transform: `translateY(${5 * Math.sin(frame * 0.2)}px) rotate(${rotationDeg}deg) scale(${scaleX}, 1)`,
            }}
          >
            <TravelHero transportType={currentTransport} width={48} height={48} />
          </div>
        )}
      </div>

      {/* Camera flash when zooming (at arrival) */}
      {showFlash && (
        <CameraFlash startFrame={arrivalStartFrame} />
      )}

      {/* Stop photo: Kawaii Pixel frame, pops after flash for 2s */}
      {showPhoto && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              border: "4px solid #ec4899",
              borderRadius: 16,
              backgroundColor: "#FFF5F7",
              padding: 8,
              boxShadow: "4px 4px 0 0 rgba(0,0,0,0.2)",
            }}
          >
            <Img
              src={photoSrc}
              alt={toStop.location || "Stop"}
              style={{
                width: 280,
                height: 210,
                objectFit: "cover",
                display: "block",
                imageRendering: "pixelated",
                filter: "contrast(1.1) brightness(1.1)",
                borderRadius: 8,
              }}
            />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

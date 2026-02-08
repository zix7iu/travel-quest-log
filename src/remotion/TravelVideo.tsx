"use client";

import {
  useCurrentFrame,
  interpolate,
  spring,
  AbsoluteFill,
  Img,
  staticFile,
  Audio,
  Sequence,
} from "remotion";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { getTotalDistanceMiles, getDaysBetween } from "@/utils/quest-stats";
import { TravelHero } from "@/remotion/TravelHero";
import { CameraShutter } from "@/remotion/components/CameraShutter";
import type { Stop } from "@/types/trip";

const WORLD_ATLAS_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// 1:1 social-friendly
const VIDEO_WIDTH = 1080;
const VIDEO_HEIGHT = 1080;
const PHOTO_AREA_HEIGHT = Math.floor(VIDEO_HEIGHT * 0.6); // top 60%
const MAP_AREA_HEIGHT = VIDEO_HEIGHT - PHOTO_AREA_HEIGHT; // bottom 40%

// Map logic: equirectangular 800x400 for lat/lng math; scale to fill container (no white space)
const WIDTH = 800;
const HEIGHT = 400;
const FPS = 30;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;
const MAP_ZOOM = 2; // Camera follow: zoomed map feels bigger; pan keeps hero centered
// Hero in lower 40% so photo overlay doesn't cover transport icon
const VIEW_CENTER_Y = HEIGHT * 0.8;
// Full 1:1 cover: map fills entire window (object-fit: cover style)
const MAP_COVER_SCALE = Math.max(VIDEO_WIDTH / WIDTH, VIDEO_HEIGHT / HEIGHT);
const MAP_COVER_OFFSET_X = (WIDTH * MAP_COVER_SCALE - VIDEO_WIDTH) / 2;
const MAP_COVER_OFFSET_Y = (HEIGHT * MAP_COVER_SCALE - VIDEO_HEIGHT) / 2;
// Transport icon (20% bigger than 22)
const HERO_SIZE = 26;
// Map stop circles (used in SVG below; 4 = ~30% smaller than original 6)
const MAP_PIN_R = 4;

// Intro: character waving at start
const INTRO_FRAMES = 45;
// Segment timeline: 0–0.5s shutter close (15), 0.5s–2.5s photo (60), 2.5s shutter open (10)
const TRAVEL_FRAMES = 50;
const SHUTTER_CLOSE_FRAMES = 15; // 0.5s
const PHOTO_FRAMES = 60; // 2s
const SHUTTER_OPEN_FRAMES = 10;
const ARRIVAL_FRAMES = SHUTTER_CLOSE_FRAMES + PHOTO_FRAMES + SHUTTER_OPEN_FRAMES; // 85
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

type Phase = "travel" | "zoom" | "photo" | "shutter_open" | "quest";

function getPhase(
  frame: number,
  segmentCount: number
): {
  phase: Phase;
  segmentIndex: number;
  localFrame: number;
  arrivalLocalFrame: number;
  questStartFrame: number;
} {
  const questStartFrame = INTRO_FRAMES + segmentCount * SEGMENT_FRAMES;
  if (frame >= questStartFrame) {
    return {
      phase: "quest",
      segmentIndex: segmentCount - 1,
      localFrame: frame - questStartFrame,
      arrivalLocalFrame: 0,
      questStartFrame,
    };
  }
  const journeyFrame = frame - INTRO_FRAMES;
  const segmentIndex = Math.floor(journeyFrame / SEGMENT_FRAMES);
  const localFrame = journeyFrame - segmentIndex * SEGMENT_FRAMES;
  if (localFrame < TRAVEL_FRAMES) {
    return { phase: "travel", segmentIndex, localFrame, arrivalLocalFrame: 0, questStartFrame };
  }
  const arrivalLocal = localFrame - TRAVEL_FRAMES;
  if (arrivalLocal < SHUTTER_CLOSE_FRAMES) {
    return { phase: "zoom", segmentIndex, localFrame, arrivalLocalFrame: arrivalLocal, questStartFrame };
  }
  if (arrivalLocal < SHUTTER_CLOSE_FRAMES + PHOTO_FRAMES) {
    return { phase: "photo", segmentIndex, localFrame, arrivalLocalFrame: arrivalLocal, questStartFrame };
  }
  return { phase: "shutter_open", segmentIndex, localFrame, arrivalLocalFrame: arrivalLocal, questStartFrame };
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
  const { phase, segmentIndex, localFrame, arrivalLocalFrame, questStartFrame } = getPhase(
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

  // Intro: character on map, no frame
  if (isIntro) {
    const bob = 4 * Math.sin(frame * 0.25);
    const introMapScale = Math.max(VIDEO_WIDTH / WIDTH, VIDEO_HEIGHT / HEIGHT);
    const introMapOffsetX = (WIDTH * introMapScale - VIDEO_WIDTH) / 2;
    const introMapOffsetY = (HEIGHT * introMapScale - VIDEO_HEIGHT) / 2;
    return (
      <AbsoluteFill
        style={{
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
          backgroundColor: "#FFF5F7",
          overflow: "hidden",
        }}
      >
        {/* Map background, scaled to fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: WIDTH,
            height: HEIGHT,
            transform: `translate(${-introMapOffsetX}px, ${-introMapOffsetY}px) scale(${introMapScale})`,
            transformOrigin: "0 0",
          }}
        >
          <WorldMapBackground />
        </div>
        {/* Character ~30% of screen, no frame */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div style={{ transform: `translateY(${bob}px)` }}>
            <Img
              src={staticFile("character.png")}
              alt="Character waving"
              width={Math.floor(VIDEO_WIDTH * 0.3)}
              height={Math.floor(VIDEO_WIDTH * 0.3)}
              style={{ objectFit: "contain", display: "block", margin: "0 auto", filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.3))" }}
            />
          </div>
          <p
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 32,
              color: "#6b21a8",
              marginTop: 24,
              textShadow: "1px 1px 0 #fff",
            }}
          >
            👋 Let&apos;s go!
          </p>
        </div>
      </AbsoluteFill>
    );
  }

  // Quest Complete: everything 30% bigger (text and character)
  if (phase === "quest") {
    const bob = 4 * Math.sin(localFrame * 0.2);
    const questCharSize = Math.floor(VIDEO_WIDTH * 0.286); // ~22% * 1.3
    return (
      <AbsoluteFill
        style={{
          width: VIDEO_WIDTH,
          height: VIDEO_HEIGHT,
          backgroundColor: "#FFF5F7",
          alignItems: "center",
          justifyContent: "center",
          padding: 48,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            textAlign: "center",
            width: "100%",
            maxWidth: VIDEO_WIDTH,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 21,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 26,
              color: "#6b21a8",
              margin: 0,
            }}
          >
            🏆 QUEST COMPLETE 🏆
          </h2>
          <p
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 18,
              color: "#4a3f5c",
              margin: 0,
            }}
          >
            Total Distance Traveled: {totalDistanceMiles.toFixed(0)} Miles
          </p>
          <p
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 18,
              color: "#4a3f5c",
              margin: 0,
            }}
          >
            Time Elapsed: {daysElapsed} Days
          </p>
          <p
            style={{
              fontFamily: "var(--font-press-start-2p), monospace",
              fontSize: 18,
              color: "#6b21a8",
              fontStyle: "italic",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 900,
            }}
          >
            &ldquo;{quote}&rdquo;
          </p>
          <div style={{ transform: `translateY(${bob}px)`, textAlign: "center", marginTop: 10 }}>
            <Img
              src={staticFile("character.png")}
              alt="Character waving"
              width={questCharSize}
              height={questCharSize}
              style={{ objectFit: "contain", display: "block", margin: "0 auto" }}
            />
            <p
              style={{
                fontFamily: "var(--font-press-start-2p), monospace",
                fontSize: 16,
                color: "#6b21a8",
                marginTop: 16,
              }}
            >
              👋 Thanks for playing!
            </p>
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

  // Pan & zoom: during travel center on hero; at arrival zoom onto destination
  const arrivalStartFrame =
    INTRO_FRAMES + segmentIndex * SEGMENT_FRAMES + TRAVEL_FRAMES;
  const zoomLocalFrame = frame - arrivalStartFrame;

  // Camera follow: pan so transport icon (hero) is always roughly centered
  const centerX =
    phase === "travel"
      ? xEnd
      : phase === "zoom"
        ? interpolate(
            zoomLocalFrame,
            [0, SHUTTER_CLOSE_FRAMES],
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
            [0, SHUTTER_CLOSE_FRAMES],
            [yEnd, y2],
            { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
          )
        : y2;

  const mapTransform = `translate(${CENTER_X}px, ${VIEW_CENTER_Y}px) scale(${MAP_ZOOM}) translate(${-centerX}px, ${-centerY}px)`;

  // Transport for this segment = how the user got TO the destination (toStop)
  const currentTransport = (toStop.transport ?? "plane").toLowerCase();
  const destinationIndex = segmentIndex + 1;
  const isArrivingAtStartingPoint = destinationIndex === 0;
  const showShutterClose = phase === "zoom" && !isArrivingAtStartingPoint;
  const showPhoto = (phase === "photo" || phase === "shutter_open") && !isArrivingAtStartingPoint;

  const photoStop = toStop as Stop & { image?: string };
  const photoSrc = photoStop.image ?? DEFAULT_SCENERY;
  // Typewriter: starts at 0.5s (frame 15 of arrival), over ~45 frames for destination, then date
  const typewriterFrame = Math.max(0, arrivalLocalFrame - SHUTTER_CLOSE_FRAMES);
  const destinationText = toStop.location || "Destination";
  const dateText = toStop.date || "";
  const destVisibleChars = Math.min(
    destinationText.length,
    Math.floor(interpolate(typewriterFrame, [0, 35], [0, destinationText.length + 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }))
  );
  const bearing = bearingDeg(x1, y1, x2, y2);
  const isLeftHemisphere =
    (bearing > 90 && bearing <= 180) || (bearing >= -180 && bearing < -90);
  const rotationDeg = isLeftHemisphere ? bearing - 180 : bearing;
  const scaleX = isLeftHemisphere ? -1 : 1;

  return (
    <AbsoluteFill
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: "#FFF5F7",
        overflow: "hidden",
      }}
    >
      {/* Full-screen map: inset 0, cover scaling so map fills 1:1 window completely */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: WIDTH,
            height: HEIGHT,
            transform: `translate(${-MAP_COVER_OFFSET_X}px, ${-MAP_COVER_OFFSET_Y}px) scale(${MAP_COVER_SCALE})`,
            transformOrigin: "0 0",
          }}
        >
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
              <circle cx={x1} cy={y1} r={MAP_PIN_R} fill="#6b21a8" />
              <circle cx={x2} cy={y2} r={MAP_PIN_R} fill="#6b21a8" />
            </svg>
            {(phase === "travel" || (phase === "zoom" && zoomLocalFrame < 2)) && (
              <div
                style={{
                  position: "absolute",
                  left: Math.max(0, Math.min(WIDTH - HERO_SIZE, xEnd - HERO_SIZE / 2)),
                  top: Math.max(0, Math.min(HEIGHT - HERO_SIZE, yEnd - HERO_SIZE / 2)),
                  pointerEvents: "none",
                  zIndex: 2,
                  transform: `translateY(${5 * Math.sin(frame * 0.2)}px) rotate(${rotationDeg}deg) scale(${scaleX}, 1)`,
                }}
              >
                <TravelHero transportType={currentTransport} width={HERO_SIZE} height={HERO_SIZE} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo overlay on map: card covers on map when at destination (no solid panel) */}
      {showPhoto && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: Math.floor(VIDEO_HEIGHT * 0.06),
            paddingLeft: Math.floor(VIDEO_WIDTH * 0.08),
            paddingRight: Math.floor(VIDEO_WIDTH * 0.08),
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: Math.floor(VIDEO_WIDTH * 0.84),
              backgroundColor: "rgba(255, 245, 247, 0.97)",
              borderRadius: 12,
              border: "3px solid #ec4899",
              boxShadow: "4px 4px 0 0 rgba(0,0,0,0.2)",
              overflow: "hidden",
            }}
          >
            {/* Banner: destination name 30% bigger, taller accordingly */}
            <div
              style={{
                padding: "14px 18px",
                backgroundColor: "#ec4899",
                borderBottom: "3px solid #1f2937",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-press-start-2p), monospace",
                  fontSize: 18,
                  color: "#fff",
                  margin: 0,
                  textAlign: "center",
                  textShadow: "2px 2px 0 #1a1a1a",
                }}
              >
                {destinationText.slice(0, destVisibleChars)}
                {destVisibleChars < destinationText.length && "|"}
              </p>
            </div>
            <div style={{ padding: 10, position: "relative" }}>
              <Img
                src={photoSrc}
                alt={toStop.location || "Stop"}
                style={{
                  width: "100%",
                  aspectRatio: "4/3",
                  objectFit: "cover",
                  display: "block",
                  imageRendering: "pixelated",
                  filter: "contrast(1.1) brightness(1.1)",
                  borderRadius: 8,
                }}
              />
              {/* Date tag: top layer, high contrast so always visible */}
              <div
                style={{
                  position: "absolute",
                  left: 14,
                  bottom: 14,
                  zIndex: 30,
                  padding: "8px 12px",
                  backgroundColor: "#fff",
                  border: "2px solid #1f2937",
                  borderRadius: 4,
                  boxShadow: "2px 2px 0 rgba(0,0,0,0.25)",
                  isolation: "isolate",
                }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-press-start-2p), monospace",
                    fontSize: 14,
                    color: "#000",
                    margin: 0,
                    lineHeight: 1.2,
                    opacity: 1,
                  }}
                >
                  {dateText ? dateText : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shutter: single flush (close only). Click plays at close; Audio here so it stays mounted at frame 110. */}
      {!isArrivingAtStartingPoint && (
        <Sequence
          from={arrivalStartFrame + SHUTTER_CLOSE_FRAMES}
          durationInFrames={60}
          name="Shutter click"
        >
          <Audio src={staticFile("camera-click.mp3")} volume={0.8} />
        </Sequence>
      )}
      {showShutterClose && (
        <CameraShutter startFrame={arrivalStartFrame} height={VIDEO_HEIGHT} mode="close" />
      )}
    </AbsoluteFill>
  );
}

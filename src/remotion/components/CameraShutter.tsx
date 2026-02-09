"use client";

import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

const CLOSE_FRAMES = 15; // 0.5s
const OPEN_FRAMES = 10;

interface CameraShutterProps {
  /** Composition frame when the shutter animation starts. */
  startFrame: number;
  /** Canvas height (for blade height). */
  height?: number;
  /** "close" = blades close from top/bottom (0–0.5s). "open" = blades open (2.5s). */
  mode: "close" | "open";
}

/**
 * Two dark lens blades. Close: from top and bottom to meet (0.5s), click at close.
 * Open: blades retract (10 frames) to reveal next segment.
 * Sound: public/camera-click.mp3 plays at the moment the shutter fully closes.
 */
export function CameraShutter({ startFrame, height = 1080, mode }: CameraShutterProps) {
  const frame = useCurrentFrame();
  const t = frame - startFrame;
  const halfHeight = height / 2;

  if (mode === "close") {
    const bladeHeight = interpolate(
      t,
      [0, CLOSE_FRAMES],
      [0, halfHeight],
      { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
    );
    return (
      <>
        <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              height: bladeHeight,
              backgroundColor: "#1a1a1a",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              right: 0,
              height: bladeHeight,
              backgroundColor: "#1a1a1a",
            }}
          />
        </AbsoluteFill>
      </>
    );
  }

  // mode === "open": blades retract over OPEN_FRAMES
  const bladeHeight = interpolate(
    t,
    [0, OPEN_FRAMES],
    [halfHeight, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          height: bladeHeight,
          backgroundColor: "#1a1a1a",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          right: 0,
          height: bladeHeight,
          backgroundColor: "#1a1a1a",
        }}
      />
    </AbsoluteFill>
  );
}

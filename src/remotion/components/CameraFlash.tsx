"use client";

import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

const FLASH_DURATION_FRAMES = 10;

interface CameraFlashProps {
  /** If set, flash runs relative to this frame (for triggering at arrival). */
  startFrame?: number;
}

/**
 * White overlay at exact arrival: opacity 1 → 0 over 10 frames (camera flash).
 * Use startFrame to trigger when transport reaches a city; photo pops after.
 */
export function CameraFlash({ startFrame = 0 }: CameraFlashProps) {
  const frame = useCurrentFrame();
  const t = startFrame !== undefined ? frame - startFrame : frame;
  const opacity = interpolate(
    t,
    [0, FLASH_DURATION_FRAMES],
    [1, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

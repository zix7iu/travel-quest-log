"use client";

import { useCallback, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { MapPreview } from "@/components/MapPreview";
import { ShareCard } from "@/components/ShareCard";
import { TripForm } from "@/components/TripForm";
import { TravelVideo } from "@/remotion/TravelVideo";
import type { Stop } from "@/types/trip";

function createEmptyStop(id: string): Stop {
  return {
    id,
    location: "",
    date: "",
    transport: "plane",
    coordinates: null,
  };
}

const INITIAL_STOPS: Stop[] = [
  createEmptyStop("1"),
  createEmptyStop("2"),
  createEmptyStop("3"),
];

const MAX_CHAPTERS = 30;
const COMPOSITION_WIDTH = 1080;
const COMPOSITION_HEIGHT = 1080; // 1:1
const FPS = 30;
// TravelVideo: intro (45) + per segment 135 frames (50 travel + 85 arrival) + quest 90
const INTRO_FRAMES = 45;
const SEGMENT_FRAMES = 135;
const QUEST_FRAMES = 90;

export default function Home() {
  const [stops, setStops] = useState<Stop[]>(INITIAL_STOPS);
  const [showVideo, setShowVideo] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const addChapter = useCallback(() => {
    setStops((prev) => {
      if (prev.length >= MAX_CHAPTERS) return prev;
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `stop-${Date.now()}`;
      return [...prev, createEmptyStop(id)];
    });
  }, []);

  const resetToNewAdventure = useCallback(() => {
    setStops(INITIAL_STOPS);
    setShowVideo(false);
  }, []);

  const removeChapter = useCallback((id: string) => {
    setStops((prev) => {
      if (prev.length <= 3) return prev;
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const copyShareLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(() => {});
  }, []);

  const coordinates = useMemo(
    () =>
      stops
        .filter(
          (s): s is Stop & { coordinates: { lat: number; lng: number } } =>
            s.coordinates != null &&
            Number.isFinite(s.coordinates.lat) &&
            Number.isFinite(s.coordinates.lng)
        )
        .map((s) => [s.coordinates.lng, s.coordinates.lat] as [number, number]),
    [stops]
  );

  const durationInFrames = useMemo(() => {
    const k = stops.filter(
      (s) =>
        s.coordinates != null &&
        Number.isFinite(s.coordinates.lat) &&
        Number.isFinite(s.coordinates.lng)
    ).length;
    if (k < 2) return 150;
    return INTRO_FRAMES + (k - 1) * SEGMENT_FRAMES + QUEST_FRAMES;
  }, [stops]);

  return (
    <div className="min-h-screen bg-strawberry-milk text-lavender-500 p-6 md:p-10">
      <main className="max-w-[600px] mx-auto flex flex-col gap-8 items-center">
        <header className="text-center w-full">
          <h1 className="font-pixel text-lg md:text-xl text-lavender-500 tracking-tight">
            ✨ My Travel Quest Log ✨
          </h1>
          <p className="text-lavender-400 mt-2 text-sm">
            Record your life&apos;s adventures like an RPG legend.
          </p>
        </header>

        {showVideo ? (
          <div className="w-full flex flex-col gap-4">
            <section className="w-full rounded-none border-[4px] border-black bg-lavender-100 overflow-hidden shadow-pixel">
              <Player
                component={TravelVideo}
                inputProps={{ stops }}
                durationInFrames={durationInFrames}
                compositionWidth={COMPOSITION_WIDTH}
                compositionHeight={COMPOSITION_HEIGHT}
                fps={FPS}
                style={{ width: "100%" }}
                controls
              />
            </section>
            <div className="grid grid-cols-3 gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowVideo(false)}
                className="font-pixel text-[10px] py-3 rounded-none border-[4px] border-black bg-lavender-200 text-lavender-500 shadow-pixel-sm transition-transform hover:-translate-y-1 flex items-center justify-center gap-1"
              >
                <span aria-hidden>✏️</span>
                Edit Quest
              </button>
              <button
                type="button"
                onClick={resetToNewAdventure}
                className="font-pixel text-[10px] py-3 rounded-none border-[4px] border-black bg-lavender-200 text-lavender-500 shadow-pixel-sm transition-transform hover:-translate-y-1 flex items-center justify-center gap-1"
              >
                <span aria-hidden>🔄</span>
                New Adventure
              </button>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="font-pixel text-[10px] py-3 rounded-none border-[4px] border-black bg-pink-bright text-white shadow-pixel transition-transform hover:-translate-y-1 flex items-center justify-center gap-1"
              >
                <span aria-hidden>💌</span>
                Share Story
              </button>
            </div>
          </div>
        ) : (
          <>
            <TripForm
              stops={stops}
              setStops={setStops}
              onGenerateClick={() => setShowVideo(true)}
              canGenerate={
                stops.filter(
                  (s) =>
                    s.coordinates != null &&
                    Number.isFinite(s.coordinates.lat) &&
                    Number.isFinite(s.coordinates.lng)
                ).length >= 3
              }
              onAddChapter={addChapter}
              canAddChapter={stops.length < MAX_CHAPTERS}
              onRemoveChapter={removeChapter}
              canRemoveChapter={stops.length > 3}
            />

            <section className="w-full rounded-none border-[4px] border-black bg-lavender-100 overflow-hidden shadow-pixel">
              <MapPreview coordinates={coordinates} />
            </section>
          </>
        )}

        {showShareModal && (
          <ShareCard
            stops={stops}
            onClose={() => setShowShareModal(false)}
            onCopyLink={copyShareLink}
            copySuccess={copySuccess}
          />
        )}
      </main>
    </div>
  );
}

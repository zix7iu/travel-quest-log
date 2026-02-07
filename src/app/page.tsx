"use client";

import { useMemo, useState } from "react";
import { MapPreview } from "@/components/MapPreview";
import { TripForm } from "@/components/TripForm";
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

export default function Home() {
  const [stops, setStops] = useState<Stop[]>(INITIAL_STOPS);

  const coordinates = useMemo(
    () =>
      stops
        .filter((s): s is Stop & { coordinates: { lat: number; lng: number } } =>
          Boolean(s.coordinates)
        )
        .map((s) => [s.coordinates.lng, s.coordinates.lat] as [number, number]),
    [stops]
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-10">
      <main className="max-w-4xl mx-auto flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Travel Summary
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
            Add your stops and see them on the map
          </p>
        </header>

        <TripForm stops={stops} setStops={setStops} />

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
          <MapPreview coordinates={coordinates} />
        </section>
      </main>
    </div>
  );
}

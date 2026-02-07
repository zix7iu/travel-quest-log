"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plane,
  Car,
  Train,
  Ship,
  Bus,
  MapPin,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import type { Stop } from "@/types/trip";

const TRANSPORT_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] =
  [
    { value: "plane", label: "Plane", Icon: Plane },
    { value: "car", label: "Car", Icon: Car },
    { value: "train", label: "Train", Icon: Train },
    { value: "ship", label: "Ship", Icon: Ship },
    { value: "bus", label: "Bus", Icon: Bus },
  ];

const GEOCODE_DEBOUNCE_MS = 500;

interface TripFormProps {
  stops: Stop[];
  setStops: React.Dispatch<React.SetStateAction<Stop[]>>;
}

export function TripForm({ stops, setStops }: TripFormProps) {
  const updateStop = useCallback(
    (id: string, updates: Partial<Omit<Stop, "id">>) => {
      setStops((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    [setStops]
  );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
        Stops
      </h2>
      <ul className="flex flex-col gap-6">
        {stops.map((stop, index) => (
          <StopRow
            key={stop.id}
            stop={stop}
            index={index + 1}
            onUpdate={(updates) => updateStop(stop.id, updates)}
          />
        ))}
      </ul>
    </div>
  );
}

interface StopRowProps {
  stop: Stop;
  index: number;
  onUpdate: (updates: Partial<Omit<Stop, "id">>) => void;
}

function StopRow({ stop, index, onUpdate }: StopRowProps) {
  const [locationInput, setLocationInput] = useState(stop.location);
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingForRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Sync external location into local input when stop changes (e.g. reset)
  useEffect(() => {
    setLocationInput(stop.location);
  }, [stop.location]);

  // Debounced geocode when user finishes typing location (500ms after last keystroke)
  useEffect(() => {
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
      geocodeTimeoutRef.current = null;
    }

    const trimmed = locationInput.trim();
    if (!trimmed) {
      onUpdateRef.current({ location: "", coordinates: null });
      return;
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      onUpdateRef.current({ location: trimmed });
      fetchingForRef.current = trimmed;
      try {
        const res = await fetch(
          `/api/geocode?city=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) {
          if (fetchingForRef.current === trimmed) {
            onUpdateRef.current({ coordinates: null });
          }
          return;
        }
        const { latitude, longitude } = await res.json();
        if (fetchingForRef.current === trimmed) {
          onUpdateRef.current({
            coordinates: { lat: latitude, lng: longitude },
          });
        }
      } catch {
        if (fetchingForRef.current === trimmed) {
          onUpdateRef.current({ coordinates: null });
        }
      } finally {
        geocodeTimeoutRef.current = null;
      }
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    };
  }, [locationInput]);

  const handleLocationChange = (value: string) => {
    setLocationInput(value);
  };

  return (
    <li className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-4 flex-wrap border-b border-zinc-100 dark:border-zinc-800 pb-6 last:border-0 last:pb-0">
      <span className="sr-only">Stop {index}</span>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <label
          htmlFor={`stop-${stop.id}-location`}
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
        >
          <MapPin className="size-3.5" />
          Location
        </label>
        <input
          id={`stop-${stop.id}-location`}
          type="text"
          value={locationInput}
          onChange={(e) => handleLocationChange(e.target.value)}
          placeholder="City or place"
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5 sm:max-w-[180px]">
        <label
          htmlFor={`stop-${stop.id}-date`}
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
        >
          <Calendar className="size-3.5" />
          Date
        </label>
        <input
          id={`stop-${stop.id}-date`}
          type="date"
          value={stop.date}
          onChange={(e) => onUpdate({ date: e.target.value })}
          className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Transport
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-1">
          {TRANSPORT_OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              title={label}
              onClick={() => onUpdate({ transport: value })}
              className={`p-2 rounded-md transition-colors ${
                stop.transport === value
                  ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </li>
  );
}

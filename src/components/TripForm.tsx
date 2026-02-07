"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plane,
  Car,
  Train,
  Ship,
  Loader2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import type { Stop } from "@/types/trip";

const TRANSPORT_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] =
  [
    { value: "plane", label: "Plane", Icon: Plane },
    { value: "car", label: "Car", Icon: Car },
    { value: "train", label: "Train", Icon: Train },
    { value: "ship", label: "Ship", Icon: Ship },
  ];

const GEOCODE_DEBOUNCE_MS = 500;

const MAX_CHAPTERS = 30;

interface TripFormProps {
  stops: Stop[];
  setStops: React.Dispatch<React.SetStateAction<Stop[]>>;
  onGenerateClick: () => void;
  canGenerate: boolean;
  onAddChapter: () => void;
  canAddChapter: boolean;
  onRemoveChapter: (id: string) => void;
  canRemoveChapter: boolean;
}

function countResolvedStops(stops: Stop[]): number {
  return stops.filter(
    (s) =>
      s.coordinates != null &&
      Number.isFinite(s.coordinates.lat) &&
      Number.isFinite(s.coordinates.lng)
  ).length;
}

export function TripForm({
  stops,
  setStops,
  onGenerateClick,
  canGenerate,
  onAddChapter,
  canAddChapter,
  onRemoveChapter,
  canRemoveChapter,
}: TripFormProps) {
  const resolvedCount = countResolvedStops(stops);
  const updateStop = useCallback(
    (id: string, updates: Partial<Omit<Stop, "id">>) => {
      setStops((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    [setStops]
  );

  return (
    <div className="w-full max-w-[600px] mx-auto flex flex-col gap-6">
      <h2 className="font-pixel text-xs text-lavender-500 text-center">
        Quest Form
      </h2>
      <ul className="flex flex-col gap-4">
        {stops.map((stop, index) => (
          <StopRow
            key={stop.id}
            stop={stop}
            index={index}
            isLastStop={index === stops.length - 1}
            isStartingPoint={index === 0}
            onUpdate={(updates) => updateStop(stop.id, updates)}
            onRemove={() => onRemoveChapter(stop.id)}
            showRemoveButton={canRemoveChapter}
          />
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onAddChapter}
          disabled={!canAddChapter}
          className="font-pixel text-xs w-full py-3 rounded-none border-[4px] border-black bg-lavender-200 text-lavender-500 shadow-pixel-sm transition-transform hover:enabled:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
        >
          <span aria-hidden>➕</span>
          Add New Chapter
        </button>
        {!canAddChapter && (
          <p className="text-xs text-lavender-500 text-center font-pixel">
            Quest Log Full! (Max {MAX_CHAPTERS})
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3 text-center">
        <p className="text-xs text-lavender-400">
          {resolvedCount} of {stops.length} destinations found. Need a Starting
          Point and two Destinations to save your adventure.
        </p>
        <button
          type="button"
          onClick={onGenerateClick}
          disabled={!canGenerate}
          className="font-pixel text-xs w-full max-w-sm mx-auto block px-6 py-4 rounded-none border-[4px] border-black bg-pink-bright text-white shadow-pixel transition-transform duration-150 hover:enabled:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          Save Adventure
        </button>
        {!canGenerate && resolvedCount < 3 && (
          <p className="text-xs text-lavender-500">
            Complete the Starting Point and at least two Destinations (with
            destinations found) to save.
          </p>
        )}
      </div>
    </div>
  );
}

interface StopRowProps {
  stop: Stop;
  index: number;
  isLastStop: boolean;
  isStartingPoint: boolean;
  onUpdate: (updates: Partial<Omit<Stop, "id">>) => void;
  onRemove: () => void;
  showRemoveButton: boolean;
}

type GeocodeStatus = "idle" | "loading" | "found" | "error";

function StopRow({
  stop,
  index,
  isLastStop,
  isStartingPoint,
  onUpdate,
  onRemove,
  showRemoveButton,
}: StopRowProps) {
  const [locationInput, setLocationInput] = useState(stop.location);
  const [geocodeStatus, setGeocodeStatus] = useState<GeocodeStatus>(() =>
    stop.location.trim() && stop.coordinates ? "found" : "idle"
  );
  const geocodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingForRef = useRef<string | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Sync external location into local input when stop changes (e.g. reset)
  useEffect(() => {
    setLocationInput(stop.location);
    if (!stop.location.trim()) setGeocodeStatus("idle");
    else if (stop.coordinates && Number.isFinite(stop.coordinates.lat)) setGeocodeStatus("found");
    // else: keep current status so "loading" can show while fetch is in progress
  }, [stop.location, stop.coordinates]);

  // Debounced geocode when user finishes typing location (500ms after last keystroke)
  useEffect(() => {
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
      geocodeTimeoutRef.current = null;
    }

    const trimmed = locationInput.trim();
    if (!trimmed) {
      setGeocodeStatus("idle");
      onUpdateRef.current({ location: "", coordinates: null });
      return;
    }

    geocodeTimeoutRef.current = setTimeout(async () => {
      onUpdateRef.current({ location: trimmed });
      fetchingForRef.current = trimmed;
      setGeocodeStatus("loading");
      try {
        const res = await fetch(
          `/api/geocode?city=${encodeURIComponent(trimmed)}`
        );
        if (!res.ok) {
          if (fetchingForRef.current === trimmed) {
            setGeocodeStatus("error");
            onUpdateRef.current({ coordinates: null });
          }
          return;
        }

        // Geocode API (Open-Meteo) returns { latitude, longitude, displayName? }
        const data = await res.json();
        const lat =
          typeof data?.latitude === "number"
            ? data.latitude
            : parseFloat(String(data?.latitude ?? ""));
        const lng =
          typeof data?.longitude === "number"
            ? data.longitude
            : parseFloat(String(data?.longitude ?? ""));

        const stillCurrent = fetchingForRef.current === trimmed;
        const validCoords =
          stillCurrent && Number.isFinite(lat) && Number.isFinite(lng);

        if (validCoords) {
          setGeocodeStatus("found");
          onUpdateRef.current({
            coordinates: { lat, lng },
          });
        } else if (stillCurrent) {
          setGeocodeStatus("error");
          onUpdateRef.current({ coordinates: null });
        }
      } catch {
        if (fetchingForRef.current === trimmed) {
          setGeocodeStatus("error");
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

  const showDateTransportPhoto = !isStartingPoint;

  return (
    <li className="relative rounded-none border-[4px] border-black bg-white/90 p-4 shadow-pixel-window transition-all duration-200">
      {/* Delete button: top-right, only when showRemoveButton (stops.length > 3) */}
      {showRemoveButton && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove chapter"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-none border-[4px] border-black bg-white text-lavender-500 hover:bg-coral-remove hover:text-white transition-colors duration-200"
          aria-label="Remove chapter"
        >
          <span className="text-sm" aria-hidden>➖</span>
        </button>
      )}

      <span className="font-pixel text-[10px] text-lavender-500 mb-3 block pr-10">
        {isStartingPoint ? "The Starting Point" : `+ Chapter ${index}`}
      </span>

      {/* Order: Date, Transport, Destination, Photo. Chapter 1: only Destination. */}
      <div
        className={`grid gap-3 transition-all duration-200 ${
          isStartingPoint ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"
        }`}
      >
        {showDateTransportPhoto && (
          <>
            <div className="flex flex-col gap-1 min-w-0">
              <label
                htmlFor={`stop-${stop.id}-date`}
                className="text-xs font-medium text-lavender-500 flex items-center gap-1.5"
              >
                <span className="text-base" aria-hidden>📅</span>
                Date
              </label>
              <input
                id={`stop-${stop.id}-date`}
                type="date"
                value={stop.date}
                onChange={(e) => onUpdate({ date: e.target.value })}
                className="w-full h-12 rounded-none border-2 border-black bg-lavender-100 px-3 text-sm text-lavender-500 focus:border-pink-quest focus:outline-none focus:ring-2 focus:ring-pink-quest/30"
              />
            </div>

            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-lavender-500 flex items-center gap-1.5">
                <span className="text-base" aria-hidden>🚀</span>
                Transport
              </label>
              <div className="w-full h-12 flex items-center gap-0.5 rounded-none border-2 border-black bg-lavender-100 p-1">
                {TRANSPORT_OPTIONS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    onClick={() => onUpdate({ transport: value })}
                    className={`flex-1 h-full flex items-center justify-center rounded-none transition-colors ${
                      stop.transport === value
                        ? "bg-pink-bright text-white border border-black"
                        : "text-lavender-400 hover:text-lavender-500 hover:bg-lavender-200"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1 min-w-0">
          <label
            htmlFor={`stop-${stop.id}-location`}
            className="text-xs font-medium text-lavender-500 flex items-center gap-1.5"
          >
            <span className="text-base" aria-hidden>🌍</span>
            Destination
          </label>
          <input
            id={`stop-${stop.id}-location`}
            type="text"
            value={locationInput}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder="e.g. Paris, Tokyo"
            className="w-full h-12 rounded-none border-2 border-black bg-lavender-100 px-3 text-sm text-lavender-500 placeholder:text-lavender-300 focus:border-pink-quest focus:outline-none focus:ring-2 focus:ring-pink-quest/30"
          />
        </div>
      </div>

      {/* Photo: only for chapters 2+ */}
      {showDateTransportPhoto && (
        <div className="flex flex-wrap items-end gap-3 mt-3">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <label
              htmlFor={`stop-${stop.id}-photo`}
              className="text-xs font-medium text-lavender-500 flex items-center gap-1.5"
            >
              <span className="text-base" aria-hidden>📷</span>
              Photo
            </label>
            <input
              id={`stop-${stop.id}-photo`}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  onUpdate({ image: dataUrl });
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
              className="w-full max-w-[200px] rounded-none border-2 border-black bg-lavender-100 px-3 py-2 text-xs text-lavender-500 file:mr-2 file:rounded-none file:border-2 file:border-black file:bg-lavender-200 file:px-2 file:py-1 file:text-xs file:text-lavender-500"
            />
          </div>
          {stop.image && (
            <div className="shrink-0 rounded-none border-[4px] border-black bg-lavender-100 p-0.5 shadow-pixel-sm overflow-hidden">
              <img
                src={stop.image}
                alt="Stop photo"
                className="w-12 h-12 object-cover block"
              />
            </div>
          )}
        </div>
      )}

      {/* Last stop only: cute immersive text */}
      {isLastStop && (
        <p className="font-pixel text-[10px] text-lavender-400 mt-3 transition-opacity duration-200">
          ✨ Your adventure ends here... for now!
        </p>
      )}

      {/* Status line below the row */}
      <p className="flex items-center gap-1.5 text-xs min-h-[1.25rem] mt-2" role="status">
        {geocodeStatus === "idle" && locationInput.trim() && (
          <span className="text-lavender-400">Waiting to look up…</span>
        )}
        {geocodeStatus === "loading" && (
          <>
            <Loader2 className="size-3.5 animate-spin text-pink-quest shrink-0" aria-hidden />
            <span className="text-pink-quest">Looking up…</span>
          </>
        )}
        {geocodeStatus === "found" && stop.coordinates && (
          <>
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" aria-hidden />
            <span className="text-emerald-600">
              Found — {stop.coordinates.lat.toFixed(2)}, {stop.coordinates.lng.toFixed(2)}
            </span>
          </>
        )}
        {geocodeStatus === "error" && (
          <span className="text-red-500 text-xs">
            Destination not found
          </span>
        )}
      </p>
    </li>
  );
}

"use client";

import type { Stop } from "@/types/trip";

interface ShareCardProps {
  stops: Stop[];
  onClose: () => void;
  onCopyLink: () => void;
  copySuccess: boolean;
}

export function ShareCard({
  stops,
  onClose,
  onCopyLink,
  copySuccess,
}: ShareCardProps) {
  const totalStops = stops.length;
  const locationsWithNames = stops
    .filter((s) => s.location.trim())
    .map((s) => s.location);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        className="w-full max-w-[400px] rounded-none border-[4px] border-black bg-strawberry-milk shadow-pixel p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Retro game "End Screen" style */}
        <div className="border-2 border-lavender-400 bg-lavender-100/80 p-4 rounded-none mb-4">
          <h2
            id="share-modal-title"
            className="font-pixel text-xs text-lavender-500 mb-3"
          >
            TRAVEL RECORDS
          </h2>
          <p className="font-pixel text-[10px] text-lavender-500 mb-2">
            CHAPTERS COMPLETED: {totalStops}
          </p>
          {locationsWithNames.length > 0 && (
            <div className="text-center mb-3">
              <p className="font-pixel text-[8px] text-lavender-400 mb-1">
                YOUR ROUTE:
              </p>
              <ul className="text-xs text-lavender-500 space-y-0.5 list-none flex flex-col items-center px-0">
                {locationsWithNames.slice(0, 8).map((name, i) => (
                  <li key={i}>• {name || "(unnamed)"}</li>
                ))}
                {locationsWithNames.length > 8 && (
                  <li className="text-lavender-400">
                    +{locationsWithNames.length - 8} more
                  </li>
                )}
              </ul>
            </div>
          )}
          <p className="font-pixel text-[10px] text-pink-quest mt-4">
            Thank you for playing!
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onCopyLink}
            className="font-pixel text-xs w-full py-3 rounded-none border-[4px] border-black bg-pink-bright text-white shadow-pixel transition-transform hover:-translate-y-1 active:translate-y-0"
          >
            {copySuccess ? "✓ Link copied!" : "💌 Copy Link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-pixel text-xs w-full py-3 rounded-none border-[4px] border-black bg-lavender-200 text-lavender-500 shadow-pixel-sm transition-transform hover:-translate-y-0.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

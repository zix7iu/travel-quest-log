/**
 * Haversine formula: distance in miles between two lat/lon points.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export interface StopWithCoords {
  coordinates: { lat: number; lng: number };
  date?: string;
}

/**
 * Sum of distances between consecutive stops (in miles).
 */
export function getTotalDistanceMiles(
  stops: StopWithCoords[]
): number {
  if (stops.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i].coordinates;
    const b = stops[i + 1].coordinates;
    total += calculateDistance(a.lat, a.lng, b.lat, b.lng);
  }
  return total;
}

/**
 * Days between first and last stop (by date string YYYY-MM-DD).
 * Returns 0 if dates missing or invalid.
 */
export function getDaysBetween(stops: { date?: string }[]): number {
  const withDates = stops.filter((s) => s.date && s.date.trim());
  if (withDates.length < 2) return 0;
  const first = new Date(withDates[0].date!.trim()).getTime();
  const last = new Date(withDates[withDates.length - 1].date!.trim()).getTime();
  if (Number.isNaN(first) || Number.isNaN(last)) return 0;
  return Math.max(0, Math.round((last - first) / (1000 * 60 * 60 * 24)));
}

export interface Stop {
  id: string;
  location: string;
  date: string;
  transport: string;
  coordinates: { lat: number; lng: number } | null;
  /** Optional photo as data URL (base64) */
  image?: string;
}

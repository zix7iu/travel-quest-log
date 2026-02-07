export interface Stop {
  id: string;
  location: string;
  date: string;
  transport: string;
  coordinates: { lat: number; lng: number } | null;
}

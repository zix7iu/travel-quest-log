import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "City name is required" }, { status: 400 });
  }

  try {
    // Switching to Open-Meteo: Faster, no API key, and very dev-friendly
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();

    // Open-Meteo returns results in a 'results' array
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return NextResponse.json({
        latitude: result.latitude,
        longitude: result.longitude,
        displayName: `${result.name}, ${result.country}`,
      });
    }

    return NextResponse.json({ error: "City not found" }, { status: 404 });
  } catch (error) {
    console.error("Geocode Error:", error);
    return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 500 });
  }
}

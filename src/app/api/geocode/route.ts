import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");

  if (!city || typeof city !== "string" || !city.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid 'city' query parameter" },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      q: city.trim(),
      format: "json",
      limit: "1",
    });

    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "TravelSummaryApp/1.0 (contact@example.com)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable" },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "City not found" },
        { status: 404 }
      );
    }

    const { lat, lon } = data[0];
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates from geocoding service" },
        { status: 502 }
      );
    }

    return NextResponse.json({ latitude, longitude });
  } catch {
    return NextResponse.json(
      { error: "Failed to geocode city" },
      { status: 500 }
    );
  }
}

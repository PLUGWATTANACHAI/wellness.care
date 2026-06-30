import type { CurrentUser } from "../../core/auth/current-user";
import { query } from "../../core/db/client";

export interface AddressSuggestion {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  source: "google_places" | "demo";
}

export interface ServiceRadiusCheck {
  bookingId: string;
  providerId: string;
  distanceMeters: number;
  serviceRadiusMeters: number;
  withinRadius: boolean;
}

const demoSuggestions: AddressSuggestion[] = [
  {
    placeId: "demo_google_place_the_river_bkk",
    displayName: "The River Residence",
    formattedAddress: "The River Residence, Charoen Nakhon Road, Bangkok",
    lat: 13.7214,
    lng: 100.5131,
    source: "demo",
  },
  {
    placeId: "demo_google_place_iconsiam_bkk",
    displayName: "ICONSIAM",
    formattedAddress: "ICONSIAM, Charoen Nakhon Road, Bangkok",
    lat: 13.7266,
    lng: 100.5104,
    source: "demo",
  },
];

export async function searchAddressSuggestions(queryText: string): Promise<AddressSuggestion[]> {
  const trimmedQuery = queryText.trim();
  if (trimmedQuery.length < 2) return [];

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return demoSuggestions.filter((suggestion) =>
      `${suggestion.displayName} ${suggestion.formattedAddress}`.toLowerCase().includes(trimmedQuery.toLowerCase()),
    );
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": process.env.GOOGLE_MAPS_API_KEY,
      "x-goog-fieldmask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({
      textQuery: trimmedQuery,
      languageCode: "th",
      regionCode: "TH",
      maxResultCount: 5,
    }),
  });

  if (!response.ok) {
    throw new Error("GOOGLE_PLACES_SEARCH_FAILED");
  }

  const body = (await response.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  return (body.places ?? [])
    .filter((place) => place.id && place.location?.latitude && place.location?.longitude)
    .map((place) => ({
      placeId: place.id as string,
      displayName: place.displayName?.text || place.formattedAddress || "Selected place",
      formattedAddress: place.formattedAddress || "",
      lat: Number(place.location?.latitude),
      lng: Number(place.location?.longitude),
      source: "google_places",
    }));
}

export async function checkProviderServiceRadius(provider: CurrentUser, bookingId: string): Promise<ServiceRadiusCheck> {
  if (!process.env.DATABASE_URL) {
    return {
      bookingId,
      providerId: provider.id,
      distanceMeters: 0,
      serviceRadiusMeters: 8000,
      withinRadius: true,
    };
  }

  const rows = await query<{
    providerId: string;
    serviceRadiusMeters: number;
    providerLat: string | null;
    providerLng: string | null;
    addressLat: string | null;
    addressLng: string | null;
  }>(
    `
      SELECT
        pp.user_id AS "providerId",
        pp.service_radius_meters AS "serviceRadiusMeters",
        pp.base_lat AS "providerLat",
        pp.base_lng AS "providerLng",
        a.lat AS "addressLat",
        a.lng AS "addressLng"
      FROM bookings b
      JOIN addresses a ON a.id = b.address_id
      JOIN provider_profiles pp ON pp.user_id = $2
      WHERE b.id = $1
    `,
    [bookingId, provider.id],
  );

  const row = rows[0];
  if (!row?.providerLat || !row.providerLng || !row.addressLat || !row.addressLng) {
    throw new Error("SERVICE_RADIUS_LOCATION_MISSING");
  }

  const distanceMeters = calculateDistanceMeters(
    Number(row.providerLat),
    Number(row.providerLng),
    Number(row.addressLat),
    Number(row.addressLng),
  );

  return {
    bookingId,
    providerId: row.providerId,
    distanceMeters: Math.round(distanceMeters),
    serviceRadiusMeters: row.serviceRadiusMeters,
    withinRadius: distanceMeters <= row.serviceRadiusMeters,
  };
}

function calculateDistanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

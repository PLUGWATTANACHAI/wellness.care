import * as Location from "expo-location";

export interface CurrentLocationAddress {
  googlePlaceId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  addressSource: "manual";
}

export async function requestCurrentLocationAddress(): Promise<CurrentLocationAddress | undefined> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    return undefined;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const lat = Number(position.coords.latitude.toFixed(6));
  const lng = Number(position.coords.longitude.toFixed(6));
  const formattedAddress = await getReadableCurrentAddress(lat, lng);

  return {
    googlePlaceId: `current_location_${lat}_${lng}`,
    formattedAddress,
    lat,
    lng,
    addressSource: "manual",
  };
}

export async function getReadableCurrentAddress(lat: number, lng: number) {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const parts = [
      address?.name,
      address?.street,
      address?.district,
      address?.city,
      address?.region,
      address?.postalCode,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  } catch {
    // Coordinates are still enough for provider matching when reverse geocoding is unavailable.
  }

  return `Current location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

import * as Location from "expo-location";

export interface CurrentLocationAddress {
  googlePlaceId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  addressSource: "manual";
}

export interface CurrentCoordinates {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

export async function requestCurrentLocationAddress(): Promise<CurrentLocationAddress | undefined> {
  const coordinates = await requestCurrentCoordinates();
  if (!coordinates) {
    return undefined;
  }

  const reverseGeocode = await Location.reverseGeocodeAsync({
    latitude: coordinates.lat,
    longitude: coordinates.lng,
  });
  const firstAddress = reverseGeocode[0];

  return {
    googlePlaceId: `current_location_${coordinates.lat.toFixed(5)}_${coordinates.lng.toFixed(5)}`,
    formattedAddress: formatReverseGeocodeAddress(firstAddress, coordinates),
    lat: coordinates.lat,
    lng: coordinates.lng,
    accuracyMeters: coordinates.accuracyMeters,
    addressSource: "manual",
  };
}

export async function requestCurrentCoordinates(): Promise<CurrentCoordinates | undefined> {
  const permissionGranted = await requestLocationPermission();
  if (!permissionGranted) {
    return undefined;
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? undefined,
  };
}

export async function requestLocationPermission() {
  const currentPermission = await Location.getForegroundPermissionsAsync();
  if (currentPermission.granted) {
    return true;
  }

  if (currentPermission.canAskAgain === false) {
    return false;
  }

  const nextPermission = await Location.requestForegroundPermissionsAsync();
  return nextPermission.granted;
}

function formatReverseGeocodeAddress(
  address: Location.LocationGeocodedAddress | undefined,
  coordinates: CurrentCoordinates,
) {
  if (!address) {
    return `Current location (${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)})`;
  }

  const parts = [
    address.name,
    address.street,
    address.district,
    address.city,
    address.region,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : `Current location (${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)})`;
}

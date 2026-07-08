import Geolocation from "@react-native-community/geolocation";
import { PermissionsAndroid, Platform } from "react-native";

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

interface NativeLocationPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
}

export async function requestCurrentLocationAddress(): Promise<CurrentLocationAddress | undefined> {
  const coordinates = await requestCurrentCoordinates();
  if (!coordinates) {
    return undefined;
  }

  return {
    googlePlaceId: `current_location_${coordinates.lat.toFixed(5)}_${coordinates.lng.toFixed(5)}`,
    formattedAddress: formatCurrentCoordinatesAddress(coordinates),
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

  const location = await getCurrentPosition({
    enableHighAccuracy: false,
    timeout: 6000,
    maximumAge: 24 * 60 * 60 * 1000,
  }).catch(() =>
    getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5 * 60 * 1000,
    }),
  );

  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    accuracyMeters: location.coords.accuracy ?? undefined,
  };
}

export async function requestLocationPermission() {
  if (Platform.OS === "android") {
    const currentFinePermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (currentFinePermission) {
      return true;
    }

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: "Allow Wellnest to use your location",
      message: "Wellnest uses your location to prepare your service address and provider ETA for active bookings.",
      buttonPositive: "Allow",
      buttonNegative: "Not now",
    });

    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  return new Promise<boolean>((resolve) => {
    const geo = Geolocation as typeof Geolocation & {
      requestAuthorization?: (success?: () => void, error?: () => void) => void;
    };

    if (!geo.requestAuthorization) {
      resolve(true);
      return;
    }

    geo.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    );
  });
}

function getCurrentPosition(options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}) {
  return new Promise<NativeLocationPosition>((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function formatCurrentCoordinatesAddress(coordinates: CurrentCoordinates) {
  return `Current location (${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)})`;
}

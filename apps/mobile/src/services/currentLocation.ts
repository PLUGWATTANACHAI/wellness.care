import { PermissionsAndroid, Platform } from "react-native";

export interface CurrentLocationAddress {
  googlePlaceId: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  addressSource: "manual";
}

export async function requestCurrentLocationAddress(): Promise<CurrentLocationAddress | undefined> {
  const permissionGranted = await requestLocationPermission();
  if (!permissionGranted) {
    return undefined;
  }

  return undefined;
}

export async function requestLocationPermission() {
  if (Platform.OS !== "android") {
    return false;
  }

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

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  getCustomerProfile,
  searchAddressSuggestions,
  updateCustomerAddress,
  updateCustomerProfile,
  type AddressSuggestionDto,
  type CustomerProfileDto,
} from "../services/api";
import { requestCurrentLocationAddress } from "../services/currentLocation";

const demoAddressSuggestion: AddressSuggestionDto = {
  placeId: "demo_google_place_iconsiam_bangkok",
  displayName: "ICONSIAM",
  formattedAddress: "ICONSIAM, Charoen Nakhon Road, Khlong San, Bangkok",
  lat: 13.72662,
  lng: 100.51039,
  source: "demo",
};

export function AccountProfileScreen() {
  const [profile, setProfile] = useState<CustomerProfileDto | undefined>();
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [condoName, setCondoName] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [note, setNote] = useState("");
  const [mapQuery, setMapQuery] = useState("");
  const [addressSearchHint, setAddressSearchHint] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestionDto[]>([]);
  const [selectedMapAddress, setSelectedMapAddress] = useState<{
    googlePlaceId?: string;
    formattedAddress?: string;
    lat?: number;
    lng?: number;
    addressSource?: "manual" | "google_places" | "google_places_demo";
  }>({});

  function applyProfile(nextProfile: CustomerProfileDto) {
    setProfile(nextProfile);
    setName(nextProfile.name || "");
    setPhone(nextProfile.phone || "");
    setEmail(nextProfile.email || "");
    setCondoName(nextProfile.address?.condoName || "");
    setMeetingPoint(nextProfile.address?.meetingPoint || "");
    setNote(nextProfile.address?.note || "");
    setMapQuery(nextProfile.address?.formattedAddress || nextProfile.address?.condoName || "");
    setSelectedMapAddress({
      googlePlaceId: nextProfile.address?.googlePlaceId,
      formattedAddress: nextProfile.address?.formattedAddress,
      lat: nextProfile.address?.lat,
      lng: nextProfile.address?.lng,
      addressSource: nextProfile.address?.addressSource,
    });
  }

  useEffect(() => {
    getCustomerProfile()
      .then((nextProfile) => {
        applyProfile(nextProfile);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function handleSave() {
    setStatus("saving");
    try {
      await updateCustomerProfile({ name, phone, email });
      const nextProfile = await updateCustomerAddress({ condoName, meetingPoint, note, ...selectedMapAddress });
      applyProfile(nextProfile);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleSearchAddress() {
    const query = mapQuery.trim() || condoName.trim();
    if (query.length < 2) {
      setAddressSearchHint("ใส่ชื่อคอนโดหรือสถานที่ก่อน เช่น ICONSIAM หรือกดใช้ที่อยู่ทดสอบได้เลย");
      return;
    }

    setStatus("saving");
    try {
      const suggestions = await searchAddressSuggestions(query);
      setAddressSuggestions(suggestions);
      setAddressSearchHint(
        suggestions.length > 0 ? "เลือกที่อยู่จากรายการด้านล่าง แล้วกด Save profile" : "ยังไม่เจอที่อยู่นี้ ลองพิมพ์ชื่อสถานที่ใหม่หรือใช้ที่อยู่ทดสอบ"
      );
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function handleUseCurrentLocation() {
    setStatus("saving");
    setAddressSearchHint("กำลังขออนุญาตใช้ตำแหน่งปัจจุบันจากมือถือ...");

    try {
      const currentLocation = await requestCurrentLocationAddress();
      if (!currentLocation) {
        setAddressSearchHint("ยังไม่ได้อนุญาตให้ใช้ตำแหน่ง พี่สามารถเปิดสิทธิ์ Location ใน Settings ของเครื่องได้ค่ะ");
        setStatus("ready");
        return;
      }

      setCondoName((current) => current.trim() || "Current location");
      setMapQuery(currentLocation.formattedAddress);
      if (!meetingPoint.trim()) {
        setMeetingPoint("Lobby / main entrance");
      }
      setSelectedMapAddress(currentLocation);
      setAddressSuggestions([]);
      setAddressSearchHint("ใช้ตำแหน่งปัจจุบันแล้ว ตรวจชื่อคอนโด/จุดนัดพบ แล้วกด Save profile");
      setStatus("ready");
    } catch {
      setAddressSearchHint("ดึงตำแหน่งไม่สำเร็จ ลองเปิด GPS/Wi-Fi แล้วกดอีกครั้ง หรือใช้ที่อยู่ทดสอบก่อนค่ะ");
      setStatus("ready");
    }
  }

  function handleSelectSuggestion(suggestion: AddressSuggestionDto) {
    setCondoName(suggestion.displayName);
    setMapQuery(suggestion.formattedAddress);
    setAddressSearchHint("เลือกที่อยู่แล้ว ใส่จุดนัดพบถ้ามี แล้วกด Save profile");
    if (!meetingPoint.trim()) {
      setMeetingPoint("Lobby / main entrance");
    }
    setSelectedMapAddress({
      googlePlaceId: suggestion.placeId,
      formattedAddress: suggestion.formattedAddress,
      lat: suggestion.lat,
      lng: suggestion.lng,
      addressSource: suggestion.source === "demo" ? "google_places_demo" : "google_places",
    });
  }

  function handleUseDemoAddress() {
    handleSelectSuggestion(demoAddressSuggestion);
    setAddressSuggestions([]);
  }

  const mapSummary =
    selectedMapAddress.googlePlaceId && selectedMapAddress.lat && selectedMapAddress.lng
      ? `${selectedMapAddress.addressSource || "map"} · ${selectedMapAddress.lat.toFixed(5)}, ${selectedMapAddress.lng.toFixed(5)}`
      : "Search and select a map address before saving.";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Account</Text>
      <Text style={styles.title}>Customer profile</Text>
      <Text style={styles.row}>
        {profile ? `${profile.tier} · ${profile.coins.toLocaleString("th-TH")} coins · ${profile.points} points` : "Loading profile..."}
      </Text>
      <TextInput onChangeText={setName} placeholder="Name" style={styles.input} value={name} />
      <TextInput onChangeText={setPhone} placeholder="Phone" style={styles.input} value={phone} />
      <TextInput autoCapitalize="none" onChangeText={setEmail} placeholder="Email" style={styles.input} value={email} />
      <TextInput onChangeText={setCondoName} placeholder="Condo name" style={styles.input} value={condoName} />
      <View style={styles.mapSearch}>
        <TextInput
          onChangeText={setMapQuery}
          placeholder="Search condo or place"
          style={[styles.input, styles.mapInput]}
          value={mapQuery}
        />
        <Pressable
          accessibilityRole="button"
          disabled={status === "loading" || status === "saving"}
          onPress={handleSearchAddress}
          style={({ pressed }) => [styles.mapButton, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.mapButtonText}>{status === "saving" ? "..." : "Search"}</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={status === "loading" || status === "saving"}
        onPress={handleUseDemoAddress}
        style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.secondaryButtonText}>Use demo address for testing</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={status === "loading" || status === "saving"}
        onPress={handleUseCurrentLocation}
        style={({ pressed }) => [styles.locationButton, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.locationButtonText}>Use current location</Text>
      </Pressable>
      {addressSearchHint ? <Text style={styles.mapHint}>{addressSearchHint}</Text> : null}
      {addressSuggestions.map((suggestion) => (
        <Pressable
          accessibilityRole="button"
          key={suggestion.placeId}
          onPress={() => handleSelectSuggestion(suggestion)}
          style={({ pressed }) => [styles.suggestion, pressed ? styles.buttonPressed : null]}
        >
          <Text style={styles.suggestionTitle}>{suggestion.displayName}</Text>
          <Text style={styles.suggestionBody}>{suggestion.formattedAddress}</Text>
        </Pressable>
      ))}
      <Text style={styles.mapSummary}>{mapSummary}</Text>
      <TextInput onChangeText={setMeetingPoint} placeholder="Meeting point" style={styles.input} value={meetingPoint} />
      <TextInput onChangeText={setNote} placeholder="Note" style={styles.input} value={note} />
      <Pressable
        accessibilityRole="button"
        disabled={status === "loading" || status === "saving"}
        onPress={handleSave}
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
      >
        <Text style={styles.buttonText}>{status === "saving" ? "Saving..." : "Save profile"}</Text>
      </Pressable>
      {status === "error" ? <Text style={styles.error}>Profile save failed. Please retry.</Text> : null}
      {status === "ready" ? <Text style={styles.note}>Profile is stored in Supabase for this demo account.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  label: {
    color: "#6d7875",
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: "#10231f",
    fontSize: 18,
    fontWeight: "800",
  },
  row: {
    color: "#10231f",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d7e2df",
    borderRadius: 8,
    color: "#10231f",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  mapSearch: {
    flexDirection: "row",
    gap: 8,
  },
  mapInput: {
    flex: 1,
  },
  mapButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    borderRadius: 8,
    backgroundColor: "#10231f",
    paddingHorizontal: 12,
  },
  mapButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#b9ddd6",
    borderRadius: 8,
    backgroundColor: "#f6fffc",
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#087f5b",
    fontWeight: "800",
  },
  locationButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#edf4ff",
    paddingVertical: 10,
  },
  locationButtonText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  mapHint: {
    color: "#50615d",
    fontSize: 12,
    lineHeight: 18,
  },
  suggestion: {
    borderWidth: 1,
    borderColor: "#b9ddd6",
    borderRadius: 8,
    backgroundColor: "#eefaf7",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestionTitle: {
    color: "#10231f",
    fontWeight: "800",
  },
  suggestionBody: {
    color: "#50615d",
    fontSize: 12,
    lineHeight: 17,
  },
  mapSummary: {
    color: "#087f5b",
    fontSize: 12,
    fontWeight: "800",
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#0793a4",
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
  },
  note: {
    color: "#6d7875",
    lineHeight: 20,
  },
  error: {
    color: "#b42318",
    fontWeight: "800",
  },
});

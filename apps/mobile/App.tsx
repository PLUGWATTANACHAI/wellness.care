import { Component, type ReactNode, useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "./src/design/theme";
import {
  loginDemoRole,
  loadStoredLogin,
  requestOtpLogin,
  verifyOtpLogin,
  type DemoLoginRole,
  type LoginResultDto,
  type OtpRequestDto,
} from "./src/services/api";

type AppSection = "customer" | "provider" | "account" | "notifications" | "privacy";

declare const require: (moduleName: string) => unknown;

export default function App() {
  const [role, setRole] = useState<AppSection>("customer");
  const [session, setSession] = useState<LoginResultDto | undefined>();
  const [sessionStatus, setSessionStatus] = useState<"loading" | "ready" | "auth_required" | "error">("loading");
  const [startupLocationStatus, setStartupLocationStatus] = useState<"checking" | "permission_ready" | "denied" | "error">("checking");

  const activeLoginRole = getLoginRole(role);
  const isSignedIn = sessionStatus === "ready";

  useEffect(() => {
    let cancelled = false;
    setSessionStatus("loading");
    loadStoredLogin(activeLoginRole)
      .then((storedSession) => {
        if (cancelled) return;
        if (storedSession) {
          setSession(storedSession);
          setSessionStatus("ready");
          return;
        }

        setSession(undefined);
        setSessionStatus("auth_required");
      })
      .catch(() => {
        if (!cancelled) setSessionStatus("auth_required");
      });

    return () => {
      cancelled = true;
    };
  }, [activeLoginRole]);

  useEffect(() => {
    if (!isSignedIn) return undefined;

    let cancelled = false;
    const requestTimer = setTimeout(() => {
      requestStartupLocationPermission()
        .then((permissionGranted) => {
          if (cancelled) return;
          if (!permissionGranted) {
            setStartupLocationStatus("denied");
            return;
          }

          setStartupLocationStatus("permission_ready");
        })
        .catch(() => {
          if (!cancelled) setStartupLocationStatus("error");
        });
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(requestTimer);
    };
  }, [isSignedIn]);

  async function handleRetryStartupLocation() {
    setStartupLocationStatus("checking");
    try {
      const permissionGranted = await requestStartupLocationPermission();
      if (!permissionGranted) {
        setStartupLocationStatus("denied");
        return;
      }

      setStartupLocationStatus("permission_ready");
    } catch {
      setStartupLocationStatus("error");
    }
  }

  return (
    <AppErrorBoundary>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.memberLine}>{session ? "พร้อมดูแลพี่วันนี้" : "Condo wellness, on demand"}</Text>
            <Text style={styles.brandTitle}>Wellnest</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{session?.user.name?.slice(0, 1) || "W"}</Text>
          </View>
        </View>
        {isSignedIn ? <View style={styles.walletRow}>
          <View style={styles.walletTile}>
            <Text style={styles.walletLabel}>Coins</Text>
            <Text style={styles.walletValue}>0</Text>
          </View>
          <View style={styles.walletTile}>
            <Text style={styles.walletLabel}>Points</Text>
            <Text style={styles.walletValue}>0</Text>
          </View>
          <View style={styles.walletTile}>
            <Text style={styles.walletLabel}>Tier</Text>
            <Text style={styles.walletValue}>Member</Text>
          </View>
        </View> : null}
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>{isSignedIn ? "พร้อมให้บริการวันนี้" : "เข้าสู่ระบบเพื่อเริ่มดูแลตัวเอง"}</Text>
            <Text style={styles.heroTitle}>{isSignedIn ? "จองบริการดูแลตัวเองถึงคอนโด" : "Wellness service ที่มาหาพี่ถึงคอนโด"}</Text>
            <Text style={styles.heroBody}>{getSessionCopy(session, sessionStatus, activeLoginRole)}</Text>
          </View>
          <View style={styles.heroProviderCard}>
            <Text style={styles.heroProviderAvatar}>WN</Text>
            <Text style={styles.heroProviderName}>ผู้ให้บริการใกล้พี่</Text>
            <Text style={styles.heroProviderMeta}>4.9 คะแนน · 18 นาที</Text>
          </View>
        </View>
        {isSignedIn ? <View style={styles.promoBand}>
          <View>
            <Text style={styles.promoTitle}>โปรสำหรับการจองครั้งแรก</Text>
            <Text style={styles.promoCopy}>บันทึกที่อยู่ครั้งเดียว แล้วจองครั้งถัดไปได้เร็วขึ้น</Text>
          </View>
          <Text style={styles.promoBadge}>New</Text>
        </View> : null}
        {isSignedIn ? <StartupLocationStatusCard onRetry={handleRetryStartupLocation} status={startupLocationStatus} /> : null}
        {isSignedIn ? <View style={styles.demoPanel}>
          <Text style={styles.demoTitle}>เส้นทางการจอง</Text>
          <View style={styles.demoSteps}>
            <DemoStep active={role === "customer"} label="เลือกบริการ" onPress={() => setRole("customer")} />
            <DemoStep active={role === "account"} label="ที่อยู่" onPress={() => setRole("account")} />
            <DemoStep active={role === "notifications"} label="สถานะ" onPress={() => setRole("notifications")} />
            <DemoStep active={role === "privacy"} label="ความปลอดภัย" onPress={() => setRole("privacy")} />
          </View>
          <Text style={styles.demoCopy}>{getDemoHint(role)}</Text>
        </View> : null}
        {isSignedIn ? <View style={styles.tabs}>
          <RoleTab active={role === "customer"} label="Home" onPress={() => setRole("customer")} />
          <RoleTab active={role === "notifications"} label="Activity" onPress={() => setRole("notifications")} />
          <RoleTab active={role === "account"} label="Profile" onPress={() => setRole("account")} />
          <RoleTab active={role === "privacy"} label="Safety" onPress={() => setRole("privacy")} />
          <RoleTab active={role === "provider"} label="Provider" onPress={() => setRole("provider")} />
        </View> : null}
        {sessionStatus === "auth_required" ? (
          <TesterLoginCard
            role={activeLoginRole}
            onSignedIn={(result) => {
              setSession(result);
              setSessionStatus("ready");
            }}
          />
        ) : null}
        {sessionStatus === "ready" && activeLoginRole === "customer" ? (
          <PilotSetupCard currentRole={role} onGoAccount={() => setRole("account")} onGoBooking={() => setRole("customer")} />
        ) : null}
        {sessionStatus === "ready" && role === "customer" ? <CustomerHomeScreenLazy /> : null}
        {sessionStatus === "ready" && role === "provider" ? <ProviderJobScreenLazy /> : null}
        {sessionStatus === "ready" && role === "account" ? <AccountProfileScreenLazy /> : null}
        {sessionStatus === "ready" && role === "notifications" ? <NotificationCenterScreenLazy /> : null}
        {isSignedIn && role === "privacy" ? <PrivacyCenterScreenLazy /> : null}
        {sessionStatus === "loading" ? <Text style={styles.loadingText}>Checking secure session...</Text> : null}
        {sessionStatus === "error" ? <Text style={styles.errorText}>Could not start a secure session. Please retry.</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </AppErrorBoundary>
  );
}

function StartupLocationStatusCard({
  onRetry,
  status,
}: {
  onRetry: () => void;
  status: "checking" | "permission_ready" | "denied" | "error";
}) {
  const copy = getStartupLocationCopy(status);
  if (!copy) return null;

  return (
    <View style={styles.locationCard}>
      <Text style={styles.locationTitle}>{copy.title}</Text>
      <Text style={styles.locationCopy}>{copy.body}</Text>
      {status === "denied" || status === "error" ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.locationRetryButton, pressed ? styles.tabPressed : null]}>
          <Text style={styles.locationRetryText}>Allow location now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

async function requestStartupLocationPermission() {
  const locationService = require("./src/services/currentLocation") as typeof import("./src/services/currentLocation");
  return locationService.requestLocationPermission();
}

function CustomerHomeScreenLazy() {
  const { CustomerHomeScreen } = require("./src/screens/CustomerHomeScreen") as typeof import("./src/screens/CustomerHomeScreen");
  return <CustomerHomeScreen />;
}

function ProviderJobScreenLazy() {
  const { ProviderJobScreen } = require("./src/screens/ProviderJobScreen") as typeof import("./src/screens/ProviderJobScreen");
  return <ProviderJobScreen />;
}

function AccountProfileScreenLazy() {
  const { AccountProfileScreen } = require("./src/screens/AccountProfileScreen") as typeof import("./src/screens/AccountProfileScreen");
  return <AccountProfileScreen />;
}

function NotificationCenterScreenLazy() {
  const { NotificationCenterScreen } = require("./src/screens/NotificationCenterScreen") as typeof import("./src/screens/NotificationCenterScreen");
  return <NotificationCenterScreen />;
}

function PrivacyCenterScreenLazy() {
  const { PrivacyCenterScreen } = require("./src/screens/PrivacyCenterScreen") as typeof import("./src/screens/PrivacyCenterScreen");
  return <PrivacyCenterScreen />;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.safe}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.container}>
            <View style={styles.loginCard}>
          <Text style={styles.demoTitle}>เปิด Wellnest ใหม่อีกครั้ง</Text>
          <Text style={styles.demoCopy}>กรุณาปิดแอพแล้วเปิดใหม่ หากยังเจอหน้านี้ให้ส่งภาพหน้าจอให้ทีมดูแล</Text>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function PilotSetupCard({
  currentRole,
  onGoAccount,
  onGoBooking,
}: {
  currentRole: AppSection;
  onGoAccount: () => void;
  onGoBooking: () => void;
}) {
  return (
    <View style={styles.setupCard}>
      <Text style={styles.demoTitle}>เริ่มจองได้ในไม่กี่ขั้นตอน</Text>
      <Text style={styles.demoCopy}>อนุญาตตำแหน่ง แล้วบันทึกที่อยู่บริการเพื่อให้ผู้ให้บริการเดินทางได้ถูกต้อง</Text>
      <View style={styles.setupActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onGoAccount}
          style={({ pressed }) => [
            styles.setupButton,
            currentRole === "account" ? styles.setupButtonActive : null,
            pressed ? styles.tabPressed : null,
          ]}
        >
          <Text style={[styles.setupButtonText, currentRole === "account" ? styles.setupButtonTextActive : null]}>บันทึกที่อยู่</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onGoBooking}
          style={({ pressed }) => [
            styles.setupButton,
            currentRole === "customer" ? styles.setupButtonActive : null,
            pressed ? styles.tabPressed : null,
          ]}
        >
          <Text style={[styles.setupButtonText, currentRole === "customer" ? styles.setupButtonTextActive : null]}>เลือกบริการ</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TesterLoginCard({ role, onSignedIn }: { role: "customer" | "provider"; onSignedIn: (result: LoginResultDto) => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [challenge, setChallenge] = useState<OtpRequestDto | undefined>();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "error">("idle");
  const trimmedPhone = phone.trim();
  const looksLikeOtpInPhoneField = !challenge && /^\d{6}$/.test(trimmedPhone);

  async function handleRequestOtp() {
    if (trimmedPhone.length < 8) return;

    setStatus("sending");
    try {
      const nextChallenge = await requestOtpLogin({ phone: trimmedPhone, role });
      setChallenge(nextChallenge);
      setOtp(nextChallenge.devOtp ?? "");
      setStatus("sent");
    } catch {
      try {
        const result = await loginDemoRole(role);
        onSignedIn(result);
      } catch {
        setStatus("error");
      }
    }
  }

  async function handleVerifyOtp() {
    if (!challenge || otp.trim().length !== 6) return;

    setStatus("verifying");
    try {
      const result = await verifyOtpLogin({
        challengeId: challenge.challengeId,
        phone: trimmedPhone,
        otp: otp.trim(),
      });
      onSignedIn(result);
    } catch {
      setStatus("error");
    }
  }

  async function handleCreateAccountPreview() {
    setStatus("verifying");
    try {
      const result = await loginDemoRole(role);
      onSignedIn(result);
    } catch {
      setStatus("error");
    }
  }

  return (
    <View style={styles.loginCard}>
      <Text style={styles.demoTitle}>{role === "provider" ? "เข้าสู่ระบบผู้ให้บริการ" : "เข้าสู่ระบบ Wellnest"}</Text>
      <Text style={styles.demoCopy}>Sign in เพื่อดูบริการ โปรโมชัน และติดตามการจองของพี่</Text>
      <Text style={styles.inputLabel}>อีเมล หรือ เบอร์โทรศัพท์</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setPhone}
        placeholder="plug@example.com หรือ 0812345678"
        style={styles.loginInput}
        value={phone}
      />
      {looksLikeOtpInPhoneField ? (
        <Text style={styles.loginHint}>ช่องนี้ใส่เบอร์โทรก่อน จากนั้นค่อยใส่รหัสยืนยันในขั้นถัดไป</Text>
      ) : null}
      <Text style={styles.inputLabel}>รหัสเข้าใช้งาน</Text>
      <TextInput
        editable={Boolean(challenge)}
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setOtp}
        placeholder={challenge ? "048550" : "ขอรหัสก่อนเข้าสู่ระบบ"}
        style={[styles.loginInput, !challenge ? styles.loginInputDisabled : null]}
        value={otp}
      />
      <Pressable
        accessibilityRole="button"
        disabled={status === "sending" || status === "verifying" || trimmedPhone.length < 8 || (Boolean(challenge) && otp.trim().length !== 6)}
        onPress={challenge ? handleVerifyOtp : handleRequestOtp}
        style={({ pressed }) => [
          styles.loginButton,
          status === "sending" || status === "verifying" || trimmedPhone.length < 8 || (Boolean(challenge) && otp.trim().length !== 6)
            ? styles.loginButtonDisabled
            : null,
          pressed ? styles.tabPressed : null,
        ]}
      >
        <Text style={styles.loginButtonText}>
          {status === "sending" ? "กำลังส่ง..." : status === "verifying" ? "กำลังตรวจสอบ..." : challenge ? "Sign in" : "ส่งรหัสเข้าใช้งาน"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={status === "verifying"}
        onPress={handleCreateAccountPreview}
        style={({ pressed }) => [styles.createAccountButton, pressed ? styles.tabPressed : null]}
      >
        <Text style={styles.createAccountText}>Create account</Text>
      </Pressable>
      <View style={styles.socialLoginGrid}>
        <AuthOptionButton disabled label="" tone="dark" />
        <AuthOptionButton disabled label="f" tone="light" />
        <AuthOptionButton disabled label="G" tone="gmail" />
      </View>
      <Text style={styles.loginHint}>Apple ID, Facebook และ Gmail จะเชื่อมต่อในรอบ production</Text>
      {challenge ? (
        <>
          {challenge.devOtp ? <Text style={styles.loginHint}>รหัสสำหรับรอบทดสอบ: {challenge.devOtp}</Text> : null}
        </>
      ) : null}
      {status === "sent" && challenge?.deliveryChannel === "tester_code" ? (
        <Text style={styles.loginHint}>ใช้รหัสที่ทีม Wellnest แจ้งสำหรับรอบทดลองใช้งาน</Text>
      ) : null}
      {status === "sent" && challenge?.deliveryChannel === "sms" ? <Text style={styles.loginHint}>ส่งรหัสแล้ว กรุณาใส่รหัสเพื่อดำเนินการต่อ</Text> : null}
      {status === "error" ? <Text style={styles.errorText}>เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจเบอร์หรือรหัสอีกครั้ง</Text> : null}
    </View>
  );
}

function AuthOptionButton({ disabled, label, tone }: { disabled?: boolean; label: string; tone: "dark" | "light" | "gmail" }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.authOption,
        tone === "dark" ? styles.authOptionDark : null,
        tone === "light" ? styles.authOptionLight : null,
        tone === "gmail" ? styles.authOptionGmail : null,
        disabled ? styles.authOptionDisabled : null,
        pressed ? styles.tabPressed : null,
      ]}
    >
      <Text
        style={[
          styles.authOptionText,
          tone === "dark" ? styles.authOptionTextInverted : null,
          tone === "gmail" ? styles.authOptionTextGmail : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DemoStep({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.demoStep, active ? styles.demoStepActive : null, pressed ? styles.tabPressed : null]}
    >
      <Text style={[styles.demoStepText, active ? styles.demoStepTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function RoleTab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tab, active ? styles.tabActive : null, pressed ? styles.tabPressed : null]}
    >
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function getLoginRole(role: AppSection): "customer" | "provider" {
  return role === "provider" ? "provider" : "customer";
}

function getSessionCopy(
  session: LoginResultDto | undefined,
  sessionStatus: "loading" | "ready" | "auth_required" | "error",
  role: DemoLoginRole,
) {
  if (sessionStatus === "ready") return `พร้อมให้บริการสำหรับ ${session?.user.name ?? role}`;
  if (sessionStatus === "auth_required") return "เข้าสู่ระบบด้วยเบอร์โทรเพื่อเริ่มจอง";
  if (sessionStatus === "loading") return "กำลังเตรียมบัญชีของพี่";
  return "ยังเชื่อมต่อบัญชีไม่ได้";
}

function getDemoHint(role: AppSection) {
  const hints: Record<typeof role, string> = {
    customer: "เลือกบริการ วันเวลา ที่อยู่ แล้วตรวจผู้ให้บริการก่อนยืนยันจอง",
    provider: "มุมมองผู้ให้บริการสำหรับรับงาน เดินทาง และอัปเดตสถานะ",
    account: "จัดการข้อมูลลูกค้า ที่อยู่ Coins และ Points",
    notifications: "ดูข้อความและสถานะการจองล่าสุด",
    privacy: "จัดการสิทธิ์ตำแหน่งและความเป็นส่วนตัว",
  };

  return hints[role];
}

function getStartupLocationCopy(status: "checking" | "permission_ready" | "denied" | "error") {
  if (status === "checking") {
    return {
      title: "เตรียมตำแหน่งบริการ",
      body: "อนุญาตตำแหน่งเพื่อช่วยบันทึกที่อยู่และคำนวณเวลาเดินทางของผู้ให้บริการ",
    };
  }
  if (status === "permission_ready") {
    return {
      title: "ใช้ตำแหน่งได้แล้ว",
      body: "ไปที่บัญชีเพื่อบันทึกที่อยู่ หรือเริ่มเลือกบริการที่ต้องการได้เลย",
    };
  }
  if (status === "denied") {
    return {
      title: "ยังไม่ได้อนุญาตตำแหน่ง",
      body: "ยังเลือกดูบริการได้ แต่ก่อนจองต้องบันทึกที่อยู่ในบัญชีก่อน",
    };
  }

  return {
    title: "ตำแหน่งยังไม่พร้อม",
    body: "เปิด GPS หรือ Wi-Fi แล้วลองบันทึกที่อยู่อีกครั้ง",
  };
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    gap: 12,
    padding: 18,
  },
  topBar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberLine: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "800",
  },
  brandTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  profileBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  profileBadgeText: {
    color: colors.teal,
    fontSize: 20,
    fontWeight: "900",
  },
  walletRow: {
    flexDirection: "row",
    gap: 8,
  },
  walletTile: {
    flex: 1,
    gap: 2,
    borderWidth: 1,
    borderColor: "#dce8e5",
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  walletLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  walletValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  heroCard: {
    minHeight: 178,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.teal,
    padding: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 7,
  },
  heroKicker: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: "900",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  heroBody: {
    color: "rgba(255,255,255,0.84)",
    lineHeight: 20,
  },
  heroProviderCard: {
    width: 112,
    gap: 6,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    padding: 10,
  },
  heroProviderAvatar: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.gold,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroProviderName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  heroProviderMeta: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    textAlign: "center",
  },
  promoBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#f1dfb0",
    borderRadius: 8,
    backgroundColor: "#fff9ea",
    padding: 12,
  },
  promoTitle: {
    color: colors.text,
    fontWeight: "900",
  },
  promoCopy: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  promoBadge: {
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.gold,
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locationCard: {
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationTitle: {
    color: colors.primary,
    fontWeight: "800",
  },
  locationCopy: {
    color: colors.textSoft,
    lineHeight: 20,
  },
  locationRetryButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingVertical: 10,
  },
  locationRetryText: {
    color: "#fff",
    fontWeight: "800",
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  demoPanel: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 12,
  },
  demoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  demoSteps: {
    flexDirection: "row",
    gap: 8,
  },
  demoStep: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 9,
  },
  demoStepActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  demoStepText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  demoStepTextActive: {
    color: colors.primary,
  },
  demoCopy: {
    color: colors.textSoft,
    lineHeight: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted,
  },
  tabPressed: {
    opacity: 0.78,
  },
  tabText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  tabTextActive: {
    color: colors.primary,
  },
  loadingText: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    color: colors.textSoft,
    padding: 12,
    textAlign: "center",
  },
  loginCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 14,
  },
  socialLoginGrid: {
    flexDirection: "row",
    gap: 8,
  },
  authOption: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  authOptionDark: {
    borderColor: colors.text,
    backgroundColor: colors.text,
  },
  authOptionLight: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  authOptionGmail: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  authOptionDisabled: {
    opacity: 0.8,
  },
  authOptionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  authOptionTextInverted: {
    color: colors.surface,
  },
  authOptionTextGmail: {
    color: "#d64b3c",
  },
  setupCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
  },
  setupActions: {
    flexDirection: "row",
    gap: 8,
  },
  setupButton: {
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingVertical: 10,
  },
  setupButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  setupButtonText: {
    color: colors.textSoft,
    fontWeight: "800",
  },
  setupButtonTextActive: {
    color: "#fff",
  },
  loginInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  loginInputDisabled: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: -4,
  },
  loginButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.primary,
    paddingVertical: 11,
  },
  loginButtonDisabled: {
    opacity: 0.45,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
  loginHint: {
    color: colors.textSoft,
    fontWeight: "700",
    lineHeight: 20,
  },
  createAccountButton: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 11,
  },
  createAccountText: {
    color: colors.primaryDark,
    fontWeight: "900",
  },
  errorText: {
    borderRadius: 8,
    backgroundColor: "#fff5f3",
    color: "#b42318",
    fontWeight: "800",
    padding: 12,
  },
});

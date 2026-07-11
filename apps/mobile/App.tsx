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

type AppSection = "customer" | "account" | "notifications" | "privacy";

declare const require: (moduleName: string) => unknown;

export default function App() {
  const [role, setRole] = useState<AppSection>("customer");
  const [authMode, setAuthMode] = useState<"sign_in" | "create_account">("sign_in");
  const [session, setSession] = useState<LoginResultDto | undefined>();
  const [sessionStatus, setSessionStatus] = useState<"loading" | "ready" | "auth_required" | "error">("loading");
  const [startupLocationStatus, setStartupLocationStatus] = useState<"checking" | "permission_ready" | "denied" | "error">("checking");

  const activeLoginRole = "customer" as const;
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
        <ScrollView contentContainerStyle={[styles.container, isSignedIn ? styles.containerWithBottomNav : null]}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.memberLine}>{session ? "พร้อมดูแลพี่วันนี้" : "Condo wellness, on demand"}</Text>
            <Text style={styles.brandTitle}>Wellnest</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{session?.user.name?.slice(0, 1) || "W"}</Text>
          </View>
        </View>
        {!isSignedIn ? <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>{isSignedIn ? "Private wellness" : "เข้าสู่ระบบเพื่อเริ่มดูแลตัวเอง"}</Text>
            <Text style={styles.heroTitle}>{isSignedIn ? "จองบริการดูแลตัวเองแบบส่วนตัว" : "Wellness service ที่มาหาพี่ถึงคอนโด"}</Text>
            <Text style={styles.heroBody}>{getSessionCopy(session, sessionStatus, activeLoginRole)}</Text>
          </View>
          <View style={styles.heroTrustCard}>
            <Text style={styles.heroTrustMark}>AW</Text>
            <Text style={styles.heroTrustName}>Verified care</Text>
            <Text style={styles.heroTrustMeta}>ยืนยันพื้นที่ · ชำระเงินปลอดภัย · ติดตามสถานะ</Text>
          </View>
        </View> : null}
        {isSignedIn ? <StartupLocationStatusCard onRetry={handleRetryStartupLocation} status={startupLocationStatus} /> : null}
        {sessionStatus === "auth_required" && authMode === "sign_in" ? (
          <TesterLoginCard
            role={activeLoginRole}
            onCreateAccount={() => setAuthMode("create_account")}
            onSignedIn={(result) => {
              setSession(result);
              setSessionStatus("ready");
              setAuthMode("sign_in");
            }}
          />
        ) : null}
        {sessionStatus === "auth_required" && authMode === "create_account" ? (
          <CreateAccountCard
            role={activeLoginRole}
            onShowSignIn={() => setAuthMode("sign_in")}
            onSignedIn={(result) => {
              setSession(result);
              setSessionStatus("ready");
              setAuthMode("sign_in");
            }}
          />
        ) : null}
        {sessionStatus === "ready" && role === "customer" ? <CustomerHomeScreenLazy /> : null}
        {sessionStatus === "ready" && role === "account" ? <AccountProfileScreenLazy /> : null}
        {sessionStatus === "ready" && role === "notifications" ? <NotificationCenterScreenLazy /> : null}
        {isSignedIn && role === "privacy" ? <PrivacyCenterScreenLazy /> : null}
        {sessionStatus === "loading" ? <Text style={styles.loadingText}>Checking secure session...</Text> : null}
        {sessionStatus === "error" ? <Text style={styles.errorText}>Could not start a secure session. Please retry.</Text> : null}
        </ScrollView>
        {isSignedIn ? (
          <View style={styles.bottomNav}>
            <RoleTab active={role === "customer"} icon="H" label="Home" onPress={() => setRole("customer")} />
            <RoleTab active={role === "notifications"} icon="B" label="Bookings" onPress={() => setRole("notifications")} />
            <RoleTab active={role === "account"} icon="P" label="Profile" onPress={() => setRole("account")} />
            <RoleTab active={role === "privacy"} icon="S" label="Safety" onPress={() => setRole("privacy")} />
          </View>
        ) : null}
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

function TesterLoginCard({
  role,
  onCreateAccount,
  onSignedIn,
}: {
  role: "customer" | "provider";
  onCreateAccount: () => void;
  onSignedIn: (result: LoginResultDto) => void;
}) {
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
        onPress={onCreateAccount}
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

function CreateAccountCard({
  role,
  onShowSignIn,
  onSignedIn,
}: {
  role: "customer" | "provider";
  onShowSignIn: () => void;
  onSignedIn: (result: LoginResultDto) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");
  const canCreate = name.trim().length >= 2 && email.trim().includes("@") && phone.trim().length >= 8 && passcode.trim().length >= 6;

  async function handleCreateAccount() {
    if (!canCreate) return;

    setStatus("creating");
    try {
      const result = await loginDemoRole(role);
      onSignedIn(result);
    } catch {
      setStatus("error");
    }
  }

  return (
    <View style={styles.loginCard}>
      <Text style={styles.demoTitle}>สร้างบัญชี Wellnest</Text>
      <Text style={styles.demoCopy}>กรอกข้อมูลพื้นฐานเพื่อจองบริการ รับแจ้งเตือน และดูแลความปลอดภัยระหว่างให้บริการ</Text>
      <Text style={styles.inputLabel}>ชื่อที่ใช้เรียก</Text>
      <TextInput onChangeText={setName} placeholder="เช่น Plug" style={styles.loginInput} value={name} />
      <Text style={styles.inputLabel}>อีเมล</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="plug@example.com"
        style={styles.loginInput}
        value={email}
      />
      <Text style={styles.inputLabel}>เบอร์โทรศัพท์</Text>
      <TextInput keyboardType="phone-pad" onChangeText={setPhone} placeholder="0812345678" style={styles.loginInput} value={phone} />
      <Text style={styles.inputLabel}>ตั้งรหัสเข้าใช้งาน</Text>
      <TextInput
        maxLength={16}
        onChangeText={setPasscode}
        placeholder="อย่างน้อย 6 ตัว"
        secureTextEntry
        style={styles.loginInput}
        value={passcode}
      />
      <Pressable
        accessibilityRole="button"
        disabled={!canCreate || status === "creating"}
        onPress={handleCreateAccount}
        style={({ pressed }) => [styles.loginButton, !canCreate || status === "creating" ? styles.loginButtonDisabled : null, pressed ? styles.tabPressed : null]}
      >
        <Text style={styles.loginButtonText}>{status === "creating" ? "กำลังสร้างบัญชี..." : "Create account"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onShowSignIn} style={({ pressed }) => [styles.createAccountButton, pressed ? styles.tabPressed : null]}>
        <Text style={styles.createAccountText}>มีบัญชีแล้ว? Sign in</Text>
      </Pressable>
      <Text style={styles.loginHint}>รอบ production จะเพิ่ม OTP/Email verification และ consent ก่อนเปิดใช้งานจริง</Text>
      {status === "error" ? <Text style={styles.errorText}>สร้างบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง</Text> : null}
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

function RoleTab({ active, icon, label, onPress }: { active: boolean; icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tab, active ? styles.tabActive : null, pressed ? styles.tabPressed : null]}
    >
      <Text style={[styles.tabIcon, active ? styles.tabTextActive : null]}>{icon}</Text>
      <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{label}</Text>
    </Pressable>
  );
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
  containerWithBottomNav: {
    paddingBottom: 108,
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
    borderColor: colors.border,
    borderRadius: 12,
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
    borderRadius: 18,
    backgroundColor: colors.primaryDark,
    padding: 18,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
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
  heroTrustCard: {
    width: 112,
    gap: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    padding: 10,
  },
  heroTrustMark: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: colors.gold,
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroTrustName: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  heroTrustMeta: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  awBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    backgroundColor: colors.surfaceSoft,
    padding: 14,
  },
  awMiniMark: {
    alignItems: "center",
    justifyContent: "center",
    width: 58,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
  },
  awMiniMarkText: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: "900",
  },
  awBandEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  awBandTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  awBandCopy: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  clinicTeaserBand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
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
  teaserButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
  },
  teaserButtonText: {
    color: "#fff",
    fontWeight: "900",
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
  bottomNav: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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
    justifyContent: "center",
    gap: 3,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "transparent",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tabActive: {
    backgroundColor: colors.surfaceMuted,
  },
  tabPressed: {
    opacity: 0.78,
  },
  tabText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "900",
  },
  tabIcon: {
    width: 22,
    height: 22,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.surfaceSoft,
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "center",
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

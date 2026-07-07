import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { CustomerHomeScreen } from "./src/screens/CustomerHomeScreen";
import { ProviderJobScreen } from "./src/screens/ProviderJobScreen";
import { PrivacyCenterScreen } from "./src/screens/PrivacyCenterScreen";
import { AccountProfileScreen } from "./src/screens/AccountProfileScreen";
import { NotificationCenterScreen } from "./src/screens/NotificationCenterScreen";
import {
  hasRoleSession,
  loginDemoRole,
  requestOtpLogin,
  verifyOtpLogin,
  type DemoLoginRole,
  type LoginResultDto,
  type OtpRequestDto,
} from "./src/services/api";

type AppSection = "customer" | "provider" | "account" | "notifications" | "privacy";

export default function App() {
  const [role, setRole] = useState<AppSection>("customer");
  const [session, setSession] = useState<LoginResultDto | undefined>();
  const [sessionStatus, setSessionStatus] = useState<"loading" | "ready" | "auth_required" | "error">("loading");

  const activeLoginRole = getLoginRole(role);

  useEffect(() => {
    const loginRole = getLoginRole(role);
    if (hasRoleSession(loginRole)) {
      setSessionStatus("ready");
      return;
    }

    setSessionStatus("loading");
    loginDemoRole(loginRole)
      .then((result) => {
        setSession(result);
        setSessionStatus("ready");
      })
      .catch(() => setSessionStatus("auth_required"));
  }, [role]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Expo / React Native MVP</Text>
          <Text style={styles.title}>Wellnest</Text>
          <Text style={styles.copy}>{getSessionCopy(session, sessionStatus, activeLoginRole)}</Text>
        </View>
        <View style={styles.demoPanel}>
          <Text style={styles.demoTitle}>Demo Run</Text>
          <View style={styles.demoSteps}>
            <DemoStep active={role === "customer"} label="1 Book" onPress={() => setRole("customer")} />
            <DemoStep active={role === "provider"} label="2 Provider" onPress={() => setRole("provider")} />
            <DemoStep active={role === "notifications"} label="3 Inbox" onPress={() => setRole("notifications")} />
            <DemoStep active={role === "privacy"} label="4 Privacy" onPress={() => setRole("privacy")} />
          </View>
          <Text style={styles.demoCopy}>{getDemoHint(role)}</Text>
        </View>
        <View style={styles.tabs}>
          <RoleTab active={role === "customer"} label="Customer" onPress={() => setRole("customer")} />
          <RoleTab active={role === "provider"} label="Provider" onPress={() => setRole("provider")} />
          <RoleTab active={role === "account"} label="Account" onPress={() => setRole("account")} />
          <RoleTab active={role === "notifications"} label="Inbox" onPress={() => setRole("notifications")} />
          <RoleTab active={role === "privacy"} label="Privacy" onPress={() => setRole("privacy")} />
        </View>
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
        {sessionStatus === "ready" && role === "customer" ? <CustomerHomeScreen /> : null}
        {sessionStatus === "ready" && role === "provider" ? <ProviderJobScreen /> : null}
        {sessionStatus === "ready" && role === "account" ? <AccountProfileScreen /> : null}
        {sessionStatus === "ready" && role === "notifications" ? <NotificationCenterScreen /> : null}
        {role === "privacy" ? <PrivacyCenterScreen /> : null}
        {sessionStatus === "loading" ? <Text style={styles.loadingText}>Checking secure session...</Text> : null}
        {sessionStatus === "error" ? <Text style={styles.errorText}>Could not start a secure session. Please retry.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
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
      <Text style={styles.demoTitle}>Pilot setup</Text>
      <Text style={styles.demoCopy}>For the first booking, save your condo and map address in Account, then return to Customer to check availability and pay.</Text>
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
          <Text style={[styles.setupButtonText, currentRole === "account" ? styles.setupButtonTextActive : null]}>Account first</Text>
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
          <Text style={[styles.setupButtonText, currentRole === "customer" ? styles.setupButtonTextActive : null]}>Book service</Text>
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

  async function handleRequestOtp() {
    if (phone.trim().length < 8) return;

    setStatus("sending");
    try {
      const nextChallenge = await requestOtpLogin({ phone: phone.trim(), role });
      setChallenge(nextChallenge);
      setOtp(nextChallenge.devOtp ?? "");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  async function handleVerifyOtp() {
    if (!challenge || otp.trim().length !== 6) return;

    setStatus("verifying");
    try {
      const result = await verifyOtpLogin({
        challengeId: challenge.challengeId,
        phone: phone.trim(),
        otp: otp.trim(),
      });
      onSignedIn(result);
    } catch {
      setStatus("error");
    }
  }

  return (
    <View style={styles.loginCard}>
      <Text style={styles.demoTitle}>{role === "provider" ? "Provider tester login" : "Customer tester login"}</Text>
      <Text style={styles.demoCopy}>Use phone OTP for closed testing. New customer phones will create a customer account after OTP verification.</Text>
      <TextInput
        keyboardType="phone-pad"
        onChangeText={setPhone}
        placeholder="Phone number"
        style={styles.loginInput}
        value={phone}
      />
      <Pressable
        accessibilityRole="button"
        disabled={status === "sending" || status === "verifying" || phone.trim().length < 8}
        onPress={handleRequestOtp}
        style={({ pressed }) => [
          styles.loginButton,
          status === "sending" || status === "verifying" || phone.trim().length < 8 ? styles.loginButtonDisabled : null,
          pressed ? styles.tabPressed : null,
        ]}
      >
        <Text style={styles.loginButtonText}>{status === "sending" ? "Sending..." : "Send OTP"}</Text>
      </Pressable>
      {challenge ? (
        <>
          <TextInput
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={setOtp}
            placeholder="6-digit OTP"
            style={styles.loginInput}
            value={otp}
          />
          <Pressable
            accessibilityRole="button"
            disabled={status === "verifying" || otp.trim().length !== 6}
            onPress={handleVerifyOtp}
            style={({ pressed }) => [
              styles.loginButton,
              status === "verifying" || otp.trim().length !== 6 ? styles.loginButtonDisabled : null,
              pressed ? styles.tabPressed : null,
            ]}
          >
            <Text style={styles.loginButtonText}>{status === "verifying" ? "Verifying..." : "Verify and continue"}</Text>
          </Pressable>
          {challenge.devOtp ? <Text style={styles.loginHint}>Development OTP: {challenge.devOtp}</Text> : null}
        </>
      ) : null}
      {status === "sent" && challenge?.deliveryChannel === "tester_code" ? (
        <Text style={styles.loginHint}>Use the closed tester code from the Wellnest operator.</Text>
      ) : null}
      {status === "sent" && challenge?.deliveryChannel === "sms" ? <Text style={styles.loginHint}>OTP sent. Please enter the code to continue.</Text> : null}
      {status === "error" ? <Text style={styles.errorText}>Login failed. Check the phone number or OTP and retry.</Text> : null}
    </View>
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
  if (sessionStatus === "ready") return `Signed-in ${session?.user.name ?? role} · ready`;
  if (sessionStatus === "auth_required") return `${role} OTP login required`;
  if (sessionStatus === "loading") return `Checking ${role} session`;
  return "Session error";
}

function getDemoHint(role: AppSection) {
  const hints: Record<typeof role, string> = {
    customer: "Create booking, confirm review, pay sandbox, then send a message or support request.",
    provider: "Accept the latest job, update trip status, send location, and reply to the customer.",
    account: "Review customer profile, coins, points, and saved map address.",
    notifications: "Check new message alerts and mark updates as read.",
    privacy: "Review consent records for privacy and location sharing.",
  };

  return hints[role];
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#eef8f8",
  },
  container: {
    gap: 14,
    padding: 18,
  },
  header: {
    gap: 6,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#0793a4",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  copy: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
  },
  demoPanel: {
    gap: 10,
    borderWidth: 1,
    borderColor: "#cfe2df",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 12,
  },
  demoTitle: {
    color: "#10231f",
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
    borderColor: "#d7e2df",
    borderRadius: 8,
    backgroundColor: "#f8fbfa",
    paddingVertical: 9,
  },
  demoStepActive: {
    borderColor: "#0793a4",
    backgroundColor: "#e7f7f4",
  },
  demoStepText: {
    color: "#50615d",
    fontWeight: "800",
  },
  demoStepTextActive: {
    color: "#0793a4",
  },
  demoCopy: {
    color: "#50615d",
    lineHeight: 20,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfe2df",
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  tabActive: {
    borderColor: "#0793a4",
    backgroundColor: "#e7f7f4",
  },
  tabPressed: {
    opacity: 0.78,
  },
  tabText: {
    color: "#50615d",
    fontWeight: "800",
  },
  tabTextActive: {
    color: "#0793a4",
  },
  loadingText: {
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#50615d",
    padding: 12,
    textAlign: "center",
  },
  loginCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: "#cfe2df",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 14,
  },
  setupCard: {
    gap: 10,
    borderWidth: 1,
    borderColor: "#9bd5d8",
    borderRadius: 10,
    backgroundColor: "#f1fbfb",
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
    borderColor: "#cfe2df",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingVertical: 10,
  },
  setupButtonActive: {
    borderColor: "#0793a4",
    backgroundColor: "#0793a4",
  },
  setupButtonText: {
    color: "#50615d",
    fontWeight: "800",
  },
  setupButtonTextActive: {
    color: "#fff",
  },
  loginInput: {
    borderWidth: 1,
    borderColor: "#d7e2df",
    borderRadius: 8,
    color: "#10231f",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  loginButton: {
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#0793a4",
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
    color: "#087f5b",
    fontWeight: "700",
    lineHeight: 20,
  },
  errorText: {
    borderRadius: 8,
    backgroundColor: "#fff5f3",
    color: "#b42318",
    fontWeight: "800",
    padding: 12,
  },
});

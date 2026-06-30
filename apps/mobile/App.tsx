import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { CustomerHomeScreen } from "./src/screens/CustomerHomeScreen";
import { ProviderJobScreen } from "./src/screens/ProviderJobScreen";
import { PrivacyCenterScreen } from "./src/screens/PrivacyCenterScreen";
import { AccountProfileScreen } from "./src/screens/AccountProfileScreen";
import { NotificationCenterScreen } from "./src/screens/NotificationCenterScreen";
import { loginDemoRole, type LoginResultDto } from "./src/services/api";

export default function App() {
  const [role, setRole] = useState<"customer" | "provider" | "account" | "notifications" | "privacy">("customer");
  const [session, setSession] = useState<LoginResultDto | undefined>();
  const [sessionStatus, setSessionStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const loginRole = role === "provider" ? "provider" : "customer";
    setSessionStatus("loading");
    loginDemoRole(loginRole)
      .then((result) => {
        setSession(result);
        setSessionStatus("ready");
      })
      .catch(() => setSessionStatus("error"));
  }, [role]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Expo / React Native MVP</Text>
          <Text style={styles.title}>Wellnest</Text>
          <Text style={styles.copy}>Signed-in {session?.user.name ?? "demo user"} · {sessionStatus}</Text>
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
        {role === "customer" ? <CustomerHomeScreen /> : null}
        {role === "provider" ? <ProviderJobScreen /> : null}
        {role === "account" ? <AccountProfileScreen /> : null}
        {role === "notifications" ? <NotificationCenterScreen /> : null}
        {role === "privacy" ? <PrivacyCenterScreen /> : null}
      </ScrollView>
    </SafeAreaView>
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

function getDemoHint(role: "customer" | "provider" | "account" | "notifications" | "privacy") {
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
});

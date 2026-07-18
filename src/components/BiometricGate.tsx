import { useState, useEffect, type ReactNode } from "react";
import { View, TouchableOpacity, AppState } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";

interface Props { children: ReactNode; }

export function BiometricGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  const authenticate = async () => {
    setChecking(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Finance Tracker", fallbackLabel: "Use passcode" });
      if (result.success) setUnlocked(true);
    } catch {}
    setChecking(false);
  };

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) { setHasBiometrics(true); await authenticate(); }
      else setUnlocked(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" && hasBiometrics) setUnlocked(false);
      else if (nextState === "active" && hasBiometrics && !unlocked) authenticate();
    });
    return () => sub.remove();
  }, [hasBiometrics, unlocked]);

  if (unlocked) return <>{children}</>;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, padding: 24 }}>
      <T variant="heading" style={{ fontSize: 24, marginBottom: 8 }}>Locked</T>
      <T variant="body" style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginBottom: 24 }}>Authenticate to access your finances</T>
      <TouchableOpacity onPress={authenticate} disabled={checking}
        style={{ borderWidth: 2, borderColor: colors.accent, paddingVertical: 14, paddingHorizontal: 48, backgroundColor: checking ? "transparent" : colors.accent }}>
        <T variant="body" style={{ color: checking ? colors.accent : colors.background, fontSize: 16, textTransform: "uppercase", fontWeight: "700" }}>
          {checking ? "Authenticating..." : "Unlock"}
        </T>
      </TouchableOpacity>
    </View>
  );
}

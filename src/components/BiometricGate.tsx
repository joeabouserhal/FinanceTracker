import { useState, useEffect, type ReactNode } from "react";
import { View, TouchableOpacity, AppState } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { getBiometricEnabled } from "@/components/BrutalistToggle";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";

interface Props { children: ReactNode }

export function BiometricGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const biometricOn = await getBiometricEnabled();
      setEnabled(biometricOn);
      if (!biometricOn) { setUnlocked(true); setChecking(false); return; }

      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hw || !enrolled) { setUnlocked(true); setChecking(false); return; }

      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Finance Tracker" });
      setUnlocked(result.success);
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active" && unlocked) {
        const biometricOn = await getBiometricEnabled();
        if (!biometricOn) return;
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) return;
        setUnlocked(false);
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Finance Tracker" });
        setUnlocked(result.success);
      }
    });
    return () => sub.remove();
  }, [unlocked]);

  if (checking || !unlocked) {
    const locked = !checking && !unlocked;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "flex-start", alignItems: "center", paddingTop: 120 }}>
        <T variant="heading" style={{ fontSize: 48, marginBottom: locked ? 16 : 0 }}>🔒</T>
        <T variant="title" style={{ marginBottom: 24 }}>Locked</T>
        {locked && (
          <TouchableOpacity
            onPress={async () => {
              const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Finance Tracker" });
              setUnlocked(result.success);
            }}
            style={{ borderWidth: 2, borderColor: colors.accent, paddingHorizontal: 32, paddingVertical: 14 }}
          >
            <T variant="body" style={{ color: colors.accent, textTransform: "uppercase", fontSize: 14 }}>Unlock</T>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return <>{children}</>;
}

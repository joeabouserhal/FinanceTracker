import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, TouchableOpacity } from "react-native";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";

const STORAGE_KEY = "biometric_enabled";

export async function getBiometricEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEY);
  return val !== "false"; // default to true
}

export async function setBiometricEnabled(enabled: boolean) {
  await AsyncStorage.setItem(STORAGE_KEY, String(enabled));
}

interface Props {
  value: boolean;
  onToggle: () => void;
  label: string;
}

export function BrutalistToggle({ value, onToggle, label }: Props) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 0 }}
    >
      <T variant="body" style={{ fontSize: 14 }}>{label}</T>
      <View
        style={{
          width: 44,
          height: 24,
          borderWidth: 2,
          borderColor: value ? colors.accent : colors.muted,
          backgroundColor: value ? colors.accent : "transparent",
          justifyContent: "center",
          paddingHorizontal: 2,
        }}
      >
        <View
          style={{
            width: 16,
            height: 16,
            backgroundColor: value ? colors.background : colors.muted,
            alignSelf: value ? "flex-end" : "flex-start",
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

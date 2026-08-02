import { View, TouchableOpacity } from "react-native";
import { T } from "@/components/ThemedText";
import { useTheme } from "@/theme/store";

interface Props {
  value: boolean;
  onToggle: () => void;
  label: string;
}

export function BrutalistToggle({ value, onToggle, label }: Props) {
  const theme = useTheme();
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
          borderColor: value ? theme.accent : theme.muted,
          backgroundColor: value ? theme.accent : "transparent",
          justifyContent: "center",
          paddingHorizontal: 2,
        }}
      >
        <View
          style={{
            width: 16,
            height: 16,
            backgroundColor: value ? theme.background : theme.muted,
            alignSelf: value ? "flex-end" : "flex-start",
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

import { TouchableOpacity } from "react-native";
import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

/** Brutalist filter chip (2px border, filled when active). */
export function FilterChip({ label, active, onPress }: Props) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 2,
        borderColor: active ? theme.accent : theme.muted,
        backgroundColor: active ? theme.accent : "transparent",
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 6,
      }}
    >
      <T variant="label" style={{ color: active ? theme.background : theme.muted, fontSize: 12 }}>
        {label}
      </T>
    </TouchableOpacity>
  );
}

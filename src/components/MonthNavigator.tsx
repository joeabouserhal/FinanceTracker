import { TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";
import type { MonthNavigation } from "@/hooks/useMonthNavigation";

interface Props {
  nav: MonthNavigation;
  style?: StyleProp<ViewStyle>;
}

/** ← month label → navigator row (opens the month picker on the label). */
export function MonthNavigator({ nav, style }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        style,
      ]}
    >
      <TouchableOpacity onPress={nav.goToPrevMonth} style={{ padding: 4 }}>
        <T variant="heading" style={{ color: theme.muted, fontSize: 18 }}>←</T>
      </TouchableOpacity>
      <TouchableOpacity onPress={nav.openPicker} style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
        <T variant="heading" style={{ fontSize: 14, color: theme.ink }}>{nav.label}</T>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={nav.goToNextMonth}
        style={{ padding: 4, opacity: nav.isCurrentMonth ? 0.3 : 1 }}
        disabled={nav.isCurrentMonth}
      >
        <T variant="heading" style={{ color: theme.muted, fontSize: 18 }}>→</T>
      </TouchableOpacity>
    </View>
  );
}

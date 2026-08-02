import { Modal, TouchableOpacity, View } from "react-native";
import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";
import { monthKey } from "@/hooks/useMonthNavigation";

interface Props {
  visible: boolean;
  /** Currently selected month key, e.g. "2026-08". */
  activeKey: string;
  /** Year being browsed in the stepper (owned by the caller, reset on open). */
  year: number;
  onYearChange: (year: number) => void;
  onSelect: (key: string) => void;
  onClose: () => void;
}

/** Month picker modal: year stepper + 12-month grid, future months blocked. */
export function MonthPickerModal({ visible, activeKey, year, onYearChange, onSelect, onClose }: Props) {
  const theme = useTheme();
  const now = monthKey(new Date());

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backdrop, padding: 24 }}>
        <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 300 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <TouchableOpacity onPress={() => onYearChange(year - 1)} style={{ padding: 4 }}>
              <T variant="heading" style={{ color: theme.muted, fontSize: 18 }}>←</T>
            </TouchableOpacity>
            <T variant="heading" style={{ fontSize: 16, color: theme.ink }}>{year}</T>
            <TouchableOpacity
              onPress={() => { if (year < new Date().getFullYear()) onYearChange(year + 1); }}
              style={{ padding: 4, opacity: year >= new Date().getFullYear() ? 0.3 : 1 }}
            >
              <T variant="heading" style={{ color: theme.muted, fontSize: 18 }}>→</T>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1;
              const monthStr = `${year}-${String(m).padStart(2, "0")}`;
              const isActive = activeKey === monthStr;
              const isFuture = monthStr > now;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => { if (!isFuture) onSelect(monthStr); }}
                  style={{
                    width: "22%", paddingVertical: 10, alignItems: "center",
                    borderWidth: 2,
                    borderColor: isActive ? theme.accent : theme.muted,
                    backgroundColor: isActive ? theme.accent : "transparent",
                    opacity: isFuture ? 0.3 : 1,
                  }}
                >
                  <T variant="label" style={{ color: isActive ? theme.background : theme.muted, fontSize: 13 }}>
                    {new Date(2000, m - 1).toLocaleDateString("en-US", { month: "short" })}
                  </T>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, borderWidth: 2, borderColor: theme.muted, paddingVertical: 10, alignItems: "center" }}>
            <T variant="body" style={{ color: theme.muted, fontSize: 14 }}>Cancel</T>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

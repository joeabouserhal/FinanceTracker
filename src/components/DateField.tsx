import { useState } from "react";
import { TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { T } from "./ThemedText";
import { DatePickerModal } from "./DatePickerModal";
import { useTheme } from "@/theme/store";
import { parseISODate } from "@/utils/date";

interface Props {
  /** "YYYY-MM-DD" or "" */
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brutalist date field: looks like the standard 2px-bordered mono input and
 * opens the in-app DatePickerModal (custom calendar, fully themed).
 * Values are local-timezone-safe YYYY-MM-DD strings (see src/utils/date.ts).
 */
export function DateField({ value, onChange, placeholder = "YYYY-MM-DD", style }: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<Date>(() => new Date());

  const open = () => {
    // Browse the month of the current value (or today) when opening.
    setView(parseISODate(value) ?? new Date());
    setVisible(true);
  };

  const shiftMonth = (delta: number) =>
    setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1, 12, 0, 0, 0));

  return (
    <>
      <TouchableOpacity
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={value ? `Date: ${value}` : "Select date"}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.background,
            borderWidth: 2,
            borderColor: theme.inputBorder,
            paddingHorizontal: 14,
            paddingVertical: 14,
            gap: 8,
          },
          style,
        ]}
      >
        <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={theme.muted} />
        <T variant="mono" style={{ flex: 1, fontSize: 15, color: value ? theme.ink : theme.placeholder }}>
          {value || placeholder}
        </T>
      </TouchableOpacity>

      <DatePickerModal
        visible={visible}
        value={value}
        year={view.getFullYear()}
        month={view.getMonth() + 1}
        onSelect={(iso) => {
          onChange(iso);
          setVisible(false);
        }}
        onClose={() => setVisible(false)}
        onPrevMonth={() => shiftMonth(-1)}
        onNextMonth={() => shiftMonth(1)}
      />
    </>
  );
}

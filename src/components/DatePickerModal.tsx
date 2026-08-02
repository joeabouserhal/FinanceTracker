import { Modal, TouchableOpacity, View } from "react-native";
import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";
import { toISODate, parseISODate, todayISO } from "@/utils/date";
import { buildMonthGrid, WEEKDAY_LETTERS } from "@/utils/calendar";

interface Props {
  visible: boolean;
  /** Currently set date ("YYYY-MM-DD" or ""). */
  value: string;
  /** Month being browsed (1-based) — controlled by the caller. */
  year: number;
  month: number;
  /** Commits immediately when a day is tapped. */
  onSelect: (date: string) => void;
  onClose: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

/**
 * In-app brutalist date picker: month selector with the year previewed beside
 * it, a Sunday-first day grid below, today outlined and the current value
 * filled. Tapping a day commits immediately.
 */
export function DatePickerModal({ visible, value, year, month, onSelect, onClose, onPrevMonth, onNextMonth }: Props) {
  const theme = useTheme();
  const today = todayISO();
  const currentValue = parseISODate(value);
  const grid = buildMonthGrid(year, month);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long" });

  // Future dates are not selectable: the viewed month is at/after the current
  // month only when the user is already there (arrows can't reach it), so the
  // next arrow is muted exactly when the view month is the current or later.
  const viewMonth = `${year}-${String(month).padStart(2, "0")}`;
  const isNextDisabled = viewMonth >= today.slice(0, 7);

  const cellFor = (day: number) => {
    const iso = toISODate(new Date(year, month - 1, day, 12, 0, 0, 0));
    const isValue = currentValue !== null && iso === value;
    const isToday = iso === today;
    return { iso, isValue, isToday, isFuture: iso > today };
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backdrop, padding: 24 }}>
        <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 340 }}>
          <T variant="heading" style={{ fontSize: 18, marginBottom: 16 }}>Select date</T>

          {/* Month selector with the year previewed beside it */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <TouchableOpacity onPress={onPrevMonth} accessibilityRole="button" accessibilityLabel="Previous month" style={{ padding: 4 }}>
              <T variant="heading" style={{ color: theme.muted, fontSize: 18 }}>←</T>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <T variant="heading" style={{ fontSize: 16, color: theme.ink }}>{monthLabel}</T>
              <T variant="label" style={{ fontSize: 13, color: theme.muted, textTransform: "none" }}>{year}</T>
            </View>
            <TouchableOpacity onPress={onNextMonth} disabled={isNextDisabled} accessibilityRole="button" accessibilityLabel="Next month" style={{ padding: 4, opacity: isNextDisabled ? 0.3 : 1 }}>
              <T variant="heading" style={{ color: theme.muted, fontSize: 18 }}>→</T>
            </TouchableOpacity>
          </View>

          {/* Weekday header */}
          <View style={{ flexDirection: "row" }}>
            {WEEKDAY_LETTERS.map((letter) => (
              <View key={letter} style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 4 }}>
                <T variant="label" style={{ fontSize: 10, color: theme.muted, textTransform: "none" }}>{letter}</T>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {grid.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
              }
              const { iso, isValue, isToday, isFuture } = cellFor(day);
              return (
                <TouchableOpacity
                  key={iso}
                  onPress={() => onSelect(iso)}
                  disabled={isFuture}
                  accessibilityRole="button"
                  accessibilityLabel={`${monthLabel} ${day}, ${year}`}
                  style={{
                    width: `${100 / 7}%`,
                    aspectRatio: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: isValue ? theme.accent : isToday ? theme.accent : "transparent",
                    backgroundColor: isValue ? theme.accent : "transparent",
                    opacity: isFuture ? 0.3 : 1,
                  }}
                >
                  <T
                    variant="mono"
                    style={{
                      fontSize: 13,
                      lineHeight: 15,
                      height: "100%",
                      textAlign: "center",
                      // Fill the cell and center the line box in it — without
                      // a fixed height/lineHeight, Android places glyphs per
                      // raw font metrics and they sit low in the square.
                      textAlignVertical: "center",
                      includeFontPadding: false,
                      color: isValue ? theme.background : theme.ink,
                    }}
                  >
                    {day}
                  </T>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, borderWidth: 2, borderColor: theme.muted, paddingVertical: 10, alignItems: "center" }}>
            <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

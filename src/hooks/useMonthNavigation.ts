import { useState } from "react";

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function monthBounds(key: string): { start: string; end: string } {
  const [y, m] = key.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${String(m).padStart(2, "0")}-01`,
    end: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Shared month navigation state for dashboard/reports:
 * current `viewMonth`, prev/next (next blocked at the current month),
 * and a picker modal (future months blocked).
 */
export function useMonthNavigation() {
  const [viewMonth, setViewMonth] = useState(() => monthKey(new Date()));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [year, month] = viewMonth.split("-").map(Number);
  const isCurrentMonth = viewMonth === monthKey(new Date());
  const bounds = monthBounds(viewMonth);

  const goToPrevMonth = () => setViewMonth(monthKey(new Date(year, month - 2, 1)));
  const goToNextMonth = () => {
    const next = monthKey(new Date(year, month, 1));
    if (next <= monthKey(new Date())) setViewMonth(next);
  };
  const selectMonth = (key: string) => {
    setViewMonth(key);
    setPickerVisible(false);
  };

  return {
    viewMonth,
    label: monthLabel(viewMonth),
    isCurrentMonth,
    bounds,
    pickerVisible,
    pickerYear,
    setPickerYear,
    goToPrevMonth,
    goToNextMonth,
    openPicker: () => {
      setPickerYear(Number(viewMonth.split("-")[0]));
      setPickerVisible(true);
    },
    selectMonth,
    closePicker: () => setPickerVisible(false),
  };
}

export type MonthNavigation = ReturnType<typeof useMonthNavigation>;

import { useTheme } from "./store";

/**
 * Shared brutalist TextInput style (border 2px, mono, dark bg).
 * `compact` for inline row inputs (Settings currency row); full for forms.
 */
export function useInputStyle(compact?: boolean) {
  const theme = useTheme();
  return {
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.inputBorder,
    color: theme.ink,
    fontFamily: "IBMPlexMono",
    fontSize: compact ? 14 : 15,
    paddingHorizontal: compact ? 10 : 14,
    paddingVertical: compact ? 6 : 14,
  } as const;
}

/**
 * Search field inside category-picker modals: spans the full row width
 * (flex: 1) with a fixed 44px height and vertically-centered text.
 */
export function useModalSearchStyle() {
  const theme = useTheme();
  return {
    flex: 1,
    height: 44,
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.inputBorder,
    color: theme.ink,
    fontFamily: "IBMPlexMono",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 0,
    textAlignVertical: "center" as const,
    includeFontPadding: false,
  } as const;
}

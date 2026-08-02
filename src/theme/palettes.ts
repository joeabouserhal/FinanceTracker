/**
 * Theme tokens + palettes.
 * Every screen/component reads colors through `useTheme()` (src/theme/store)
 * — never raw hex literals — so switching themes restyles the whole app.
 */
export interface ThemeTokens {
  id: string;
  name: string;
  /** App background (screens, tab bar, modals). */
  background: string;
  /** Slightly-raised surface (inputs, cards). */
  surface: string;
  /** Primary text. */
  ink: string;
  /** Secondary text, inactive states. */
  muted: string;
  /** Primary accent (buttons, highlights, FAB). */
  accent: string;
  /** Income amounts / income category type. */
  income: string;
  /** Expense amounts / expense category type / destructive. */
  expense: string;
  /** Dividers, card outlines. */
  border: string;
  /** TextInput borders. */
  inputBorder: string;
  /** TextInput placeholder text. */
  placeholder: string;
  /** Modal scrim. */
  backdrop: string;
}

const P = {
  /** The app's original dark brutalist look (default). */
  brutalist: {
    id: "brutalist",
    name: "Brutalist Dark",
    background: "#0A0A0A",
    surface: "#111111",
    ink: "#F5F1E8",
    muted: "#77746C",
    accent: "#F4C430",
    income: "#4C9A63",
    expense: "#E8432E",
    border: "#1A1A1A",
    inputBorder: "#555555",
    placeholder: "#333333",
    backdrop: "rgba(0,0,0,0.7)",
  },
  monokai: {
    id: "monokai",
    name: "Monokai",
    background: "#272822",
    surface: "#2E2F29",
    ink: "#F8F8F2",
    muted: "#75715E",
    accent: "#66D9EF",
    income: "#A6E22E",
    expense: "#F92672",
    border: "#3E3D32",
    inputBorder: "#75715E",
    placeholder: "#4C4A3F",
    backdrop: "rgba(0,0,0,0.7)",
  },
  oneDark: {
    id: "oneDark",
    name: "One Dark",
    background: "#282C34",
    surface: "#2C313A",
    ink: "#ABB2BF",
    muted: "#5C6370",
    accent: "#61AFEF",
    income: "#98C379",
    expense: "#E06C75",
    border: "#3E4451",
    inputBorder: "#4B5263",
    placeholder: "#3F4450",
    backdrop: "rgba(0,0,0,0.7)",
  },
  dracula: {
    id: "dracula",
    name: "Dracula",
    background: "#282A36",
    surface: "#2F3240",
    ink: "#F8F8F2",
    muted: "#6272A4",
    accent: "#BD93F9",
    income: "#50FA7B",
    expense: "#FF5555",
    border: "#44475A",
    inputBorder: "#5B6072",
    placeholder: "#3E4152",
    backdrop: "rgba(0,0,0,0.7)",
  },
  tokyoNight: {
    id: "tokyoNight",
    name: "Tokyo Night",
    background: "#1A1B26",
    surface: "#1F2130",
    ink: "#C0CAF5",
    muted: "#565F89",
    accent: "#7AA2F7",
    income: "#9ECE6A",
    expense: "#F7768E",
    border: "#24283B",
    inputBorder: "#3B4261",
    placeholder: "#2E3448",
    backdrop: "rgba(0,0,0,0.7)",
  },
  catppuccin: {
    id: "catppuccin",
    name: "Catppuccin",
    background: "#1E1E2E",
    surface: "#232338",
    ink: "#CDD6F4",
    muted: "#6C7086",
    accent: "#89B4FA",
    income: "#A6E3A1",
    expense: "#F38BA8",
    border: "#313244",
    inputBorder: "#45475A",
    placeholder: "#383A4E",
    backdrop: "rgba(0,0,0,0.7)",
  },
} satisfies Record<string, ThemeTokens>;

export const PALETTES: Record<string, ThemeTokens> = P;
export const DEFAULT_THEME_ID = "brutalist";

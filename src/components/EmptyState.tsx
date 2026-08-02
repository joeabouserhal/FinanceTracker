import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";
import type { TextStyle } from "react-native";

interface Props {
  message: string;
  centered?: boolean;
  style?: TextStyle;
}

/** Muted empty-state message used across list screens. */
export function EmptyState({ message, centered = true, style }: Props) {
  const theme = useTheme();
  return (
    <T
      variant="body"
      style={{
        color: theme.muted,
        paddingHorizontal: 16,
        marginTop: 40,
        textAlign: centered ? "center" : "left",
        ...style,
      }}
    >
      {message}
    </T>
  );
}

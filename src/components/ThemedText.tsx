import { Text, type TextProps, type TextStyle } from "react-native";
import { useTheme } from "@/theme/store";

type Variant = "heading" | "body" | "mono" | "label" | "title";

export function T({ variant = "body", style, ...rest }: TextProps & { variant?: Variant }) {
  const theme = useTheme();
  const fonts: Record<Variant, TextStyle> = {
    heading: { fontFamily: "ArchivoBlack", color: theme.ink },
    body:    { fontFamily: "IBMPlexSans", color: theme.ink },
    mono:    { fontFamily: "IBMPlexMono", color: theme.ink },
    label:   { fontFamily: "IBMPlexSans", color: theme.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
    title:   { fontFamily: "ArchivoBlack", color: theme.ink, fontSize: 24 },
  };
  return <Text style={[fonts[variant], style]} {...rest} />;
}

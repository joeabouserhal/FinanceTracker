import { Text, type TextProps, type TextStyle } from "react-native";

type Variant = "heading" | "body" | "mono" | "label" | "title";

const fonts: Record<Variant, TextStyle> = {
  heading: { fontFamily: "ArchivoBlack", color: "#F5F1E8" },
  body:    { fontFamily: "IBMPlexSans", color: "#F5F1E8" },
  mono:    { fontFamily: "IBMPlexMono", color: "#F5F1E8" },
  label:   { fontFamily: "IBMPlexSans", color: "#77746C", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  title:   { fontFamily: "ArchivoBlack", color: "#F5F1E8", fontSize: 24 },
};

interface Props extends TextProps {
  variant?: Variant;
}

export function T({ variant = "body", style, ...rest }: Props) {
  return <Text style={[fonts[variant], style]} {...rest} />;
}

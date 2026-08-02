import { View } from "react-native";
import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";

interface Props {
  title: string;
  subtitle?: string;
  /** Optional action on the right of the header (e.g. Filters toggle). */
  right?: React.ReactNode;
}

/** Sticky screen header used by every tab/form screen. */
export function ScreenHeader({ title, subtitle, right }: Props) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
        backgroundColor: theme.background,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View style={{ flex: 1 }}>
        <T variant="title">{title}</T>
        {subtitle ? (
          <T variant="body" style={{ color: theme.muted, fontSize: 14, marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

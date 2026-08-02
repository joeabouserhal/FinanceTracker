import { AnimatedFAB } from "./AnimatedFAB";
import { T } from "./ThemedText";
import { useTheme } from "@/theme/store";

/** Standard floating add button (56×56, accent fill, bottom-right). */
export function AddFAB({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <AnimatedFAB
      style={{
        position: "absolute",
        bottom: 24,
        right: 24,
        zIndex: 10,
        backgroundColor: theme.accent,
        width: 56,
        height: 56,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: theme.accent,
      }}
      onPress={onPress}
    >
      <T variant="heading" style={{ color: theme.background, fontSize: 28 }}>+</T>
    </AnimatedFAB>
  );
}

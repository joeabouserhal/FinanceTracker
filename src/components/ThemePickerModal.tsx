import { Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { T } from "./ThemedText";
import { PALETTES } from "@/theme/palettes";
import { useTheme, useThemeStore } from "@/theme/store";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** Open-source theme list: swatch preview per palette, tap to apply + persist. */
export function ThemePickerModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const themeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backdrop, padding: 24 }}>
        <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 320, maxHeight: "75%" }}>
          <T variant="heading" style={{ fontSize: 18, marginBottom: 4 }}>Theme</T>
          <T variant="body" style={{ color: theme.muted, fontSize: 13, marginBottom: 12 }}>Open-source palettes</T>
          {/* No flex:1 here — the panel sizes to content, so a flex-basis-0
              ScrollView would collapse to 0 height. Size to content + cap. */}
          <ScrollView style={{ maxHeight: 360 }}>
            {Object.values(PALETTES).map((p) => {
              const active = p.id === themeId;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setTheme(p.id)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                >
                  <View style={{ flexDirection: "row", gap: 4, marginRight: 12 }}>
                    <View style={{ width: 16, height: 16, backgroundColor: p.background, borderWidth: 1, borderColor: p.border }} />
                    <View style={{ width: 16, height: 16, backgroundColor: p.accent }} />
                    <View style={{ width: 16, height: 16, backgroundColor: p.income }} />
                    <View style={{ width: 16, height: 16, backgroundColor: p.expense }} />
                  </View>
                  <T variant="body" style={{ flex: 1, fontSize: 15, color: active ? theme.accent : theme.ink }}>{p.name}</T>
                  {active && <T variant="body" style={{ color: theme.accent, fontSize: 14 }}>✓</T>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, borderWidth: 2, borderColor: theme.muted, paddingVertical: 10, alignItems: "center" }}>
            <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>Close</T>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

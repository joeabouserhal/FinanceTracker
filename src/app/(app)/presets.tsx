import { View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { usePresets } from "@/hooks/usePresets";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";

export default function PresetsList() {
  const router = useRouter();
  const { data: presets } = usePresets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, backgroundColor: colors.background }}>
        <T variant="title">Presets</T>
      </View>

      <TouchableOpacity style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, backgroundColor: colors.accent, width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent }} onPress={() => router.push("/(app)/preset-form")}>
        <T variant="heading" style={{ color: colors.background, fontSize: 28 }}>+</T>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }}>
        {!presets || presets.length === 0 ? (
          <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, marginTop: 40, textAlign: "center" }}>No presets yet. Tap + to create one.</T>
        ) : presets.map((p) => (
          <TouchableOpacity key={p.id} onPress={() => router.push({ pathname: "/(app)/preset-form", params: { id: p.id } })} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.muted, borderStyle: "dashed", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View><T variant="body" style={{ fontSize: 16 }}>{p.name}</T><T variant="label" style={{ marginTop: 2 }}>{p.type}</T></View>
            {p.default_amount != null && <T variant="mono" style={{ color: p.type === "income" ? colors.income : colors.expense, fontSize: 16 }}>{(p.default_amount / 100).toFixed(2)}</T>}
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

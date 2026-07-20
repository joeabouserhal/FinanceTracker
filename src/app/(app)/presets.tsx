import { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { usePresets } from "@/hooks/usePresets";
import { useCategories } from "@/hooks/useCategories";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";

export default function PresetsList() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { data: presets } = usePresets(typeFilter === "all" ? undefined : typeFilter);
  const { data: categories } = useCategories();

  const catMap = new Map(categories?.map((c) => [c.id, c]) ?? []);
  const filteredPresets = categoryFilter
    ? presets?.filter((p) => p.default_category_id === categoryFilter)
    : presets;
  const typeCats = typeFilter === "all" ? categories : categories?.filter((c) => c.type === typeFilter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.background }}>
        <T variant="title">Presets</T>
      </View>

      {/* Type filter */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(["all", "income", "expense"] as const).map((t) => (
            <FilterChip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={typeFilter === t} onPress={() => { setTypeFilter(t); setCategoryFilter(null); }} />
          ))}
        </ScrollView>
      </View>

      {/* Category filter */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="All" active={!categoryFilter} onPress={() => setCategoryFilter(null)} />
          {typeCats?.map((c) => (
            <FilterChip key={c.id} label={c.name} active={categoryFilter === c.id} onPress={() => setCategoryFilter(c.id === categoryFilter ? null : c.id)} />
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, backgroundColor: colors.accent, width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent }} onPress={() => router.push("/preset-form")}>
        <T variant="heading" style={{ color: colors.background, fontSize: 28 }}>+</T>
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }}>
        {!filteredPresets || filteredPresets.length === 0 ? (
          <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, marginTop: 40, textAlign: "center" }}>No presets yet. Tap + to create one.</T>
        ) : filteredPresets.map((p) => {
          const cat = p.default_category_id ? catMap.get(p.default_category_id) : null;
          return (
            <TouchableOpacity key={p.id} onPress={() => router.push({ pathname: "/preset-form", params: { id: p.id } })} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#77746C", borderStyle: "dashed", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <T variant="body" style={{ fontSize: 16 }}>{p.name}</T>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <T variant="label" style={{ color: p.type === "income" ? colors.income : colors.expense, fontSize: 10 }}>{p.type}</T>
                  {cat && (
                    <>
                      <View style={{ width: 4, height: 4, backgroundColor: colors.muted }} />
                      <View style={{ width: 8, height: 8, backgroundColor: cat.color ?? colors.muted }} />
                      <T variant="label" style={{ fontSize: 10, color: colors.muted }}>{cat.name}</T>
                    </>
                  )}
                </View>
              </View>
              {p.default_amount != null && <T variant="mono" style={{ color: p.type === "income" ? colors.income : colors.expense, fontSize: 16 }}>{(p.default_amount / 100).toFixed(2)}</T>}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderWidth: 2,
        borderColor: active ? colors.accent : colors.muted,
        backgroundColor: active ? colors.accent : "transparent",
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 6,
      }}
    >
      <T variant="label" style={{ color: active ? colors.background : colors.muted, fontSize: 12 }}>{label}</T>
    </TouchableOpacity>
  );
}

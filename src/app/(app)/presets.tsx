import { useState } from "react";
import { View, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { usePresets } from "@/hooks/usePresets";
import { AnimatedFAB } from "@/components/AnimatedFAB";
import { useCategories } from "@/hooks/useCategories";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpandCollapse } from "@/utils/animations";

export default function PresetsList() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const { data: presets } = usePresets(typeFilter === "all" ? undefined : typeFilter);
  const { data: categories } = useCategories();

  const catMap = new Map(categories?.map((c) => [c.id, c]) ?? []);
  const filteredPresets = (categoryFilter
    ? presets?.filter((p) => p.default_category_id === categoryFilter)
    : presets)?.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())) ?? [];
  const typeCats = typeFilter === "all" ? categories : categories?.filter((c) => c.type === typeFilter);

  const hasFilters = typeFilter !== "all" || categoryFilter;

  // Category search modal
  const [catSearchVisible, setCatSearchVisible] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState("");

  const expand = useExpandCollapse(showFilters);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.background, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T variant="title">Presets</T>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={{ borderWidth: 2, borderColor: hasFilters ? colors.accent : colors.muted, backgroundColor: hasFilters ? colors.accent : "transparent", paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <T variant="label" style={{ color: hasFilters ? colors.background : colors.muted, fontSize: 12 }}>{showFilters ? "Hide" : "Filters"}</T>
        </TouchableOpacity>
      </View>

      {expand.render && (
      <Animated.View style={expand.outerStyle}>
      <Animated.View style={expand.innerStyle}>
        <View>
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
              <TouchableOpacity onPress={() => { setCatSearchQuery(""); setCatSearchVisible(true); }} style={{ borderWidth: 2, borderColor: categoryFilter ? colors.accent : colors.muted, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, alignItems: "center", justifyContent: "center", backgroundColor: categoryFilter ? colors.accent : "transparent" }}>
                <MaterialCommunityIcons name="filter-variant" size={14} color={categoryFilter ? colors.background : colors.muted} />
              </TouchableOpacity>
              <FilterChip label="All" active={!categoryFilter} onPress={() => setCategoryFilter(null)} />
              {typeCats?.map((c) => (
                <FilterChip key={c.id} label={c.name} active={categoryFilter === c.id} onPress={() => setCategoryFilter(c.id === categoryFilter ? null : c.id)} />
              ))}
            </ScrollView>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555", height: 44, paddingHorizontal: 10 }}>
              <MaterialCommunityIcons name="magnify" size={16} color={colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, color: "#F5F1E8", fontSize: 15, fontFamily: "IBMPlexMono", paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
                placeholder="Search presets"
                placeholderTextColor="#333"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={{ borderWidth: 2, borderColor: colors.muted, paddingHorizontal: 12, height: 44, justifyContent: "center", marginLeft: 6 }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 16 }}>✕</T>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
      </Animated.View>
      )}

      <AnimatedFAB style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, backgroundColor: colors.accent, width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent }} onPress={() => router.push("/preset-form")}>
        <T variant="heading" style={{ color: colors.background, fontSize: 28 }}>+</T>
      </AnimatedFAB>

      <ScrollView style={{ flex: 1 }}>
        {!filteredPresets || filteredPresets.length === 0 ? (
          <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, marginTop: 40, textAlign: "center" }}>No presets yet. Tap + to create one.</T>
        ) : filteredPresets.map((p, i) => {
          const cat = p.default_category_id ? catMap.get(p.default_category_id) : null;
          const isLast = i === filteredPresets.length - 1;
          return (
            <TouchableOpacity key={p.id} onPress={() => router.push({ pathname: "/preset-form", params: { id: p.id } })} activeOpacity={0.7} style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: isLast ? 0 : 1, borderBottomColor: "#77746C", borderStyle: "dashed" }}>
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

      {/* Category search modal */}
      <Modal transparent visible={catSearchVisible} animationType="fade" onRequestClose={() => setCatSearchVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", padding: 24, paddingTop: 80 }}>
          <View style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 0, fontSize: 15, fontFamily: "IBMPlexMono", height: 44, textAlignVertical: "center", includeFontPadding: false }}
                placeholder="Search"
                placeholderTextColor="#333"
                value={catSearchQuery}
                onChangeText={setCatSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => setCatSearchVisible(false)} style={{ borderWidth: 2, borderColor: colors.muted, paddingHorizontal: 14, justifyContent: "center", marginLeft: 8 }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 14, textTransform: "uppercase" }}>Close</T>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {typeCats?.filter((c) => c.name.toLowerCase().includes(catSearchQuery.toLowerCase())).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { setCategoryFilter(c.id === categoryFilter ? null : c.id); setCatSearchVisible(false); setCatSearchQuery(""); }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}
                >
                  <View style={{ width: 12, height: 12, backgroundColor: c.color ?? colors.muted, marginRight: 12 }} />
                  <T variant="body" style={{ fontSize: 16, color: categoryFilter === c.id ? colors.accent : colors.ink }}>{c.name}</T>
                  {categoryFilter === c.id && <T variant="label" style={{ color: colors.accent, marginLeft: "auto" }}>✓</T>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

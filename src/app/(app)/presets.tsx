import { useState } from "react";
import { View, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { usePresets } from "@/hooks/usePresets";
import { AddFAB } from "@/components/AddFAB";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FilterChip } from "@/components/FilterChip";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { useCategories } from "@/hooks/useCategories";
import { T } from "@/components/ThemedText";
import { useTheme } from "@/theme/store";
import { useModalSearchStyle } from "@/theme/styles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpandCollapse } from "@/utils/animations";

export default function PresetsList() {
  const router = useRouter();
  const theme = useTheme();
  const modalSearchStyle = useModalSearchStyle();
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
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenHeader
        title="Presets"
        right={
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={{ borderWidth: 2, borderColor: hasFilters ? theme.accent : theme.muted, backgroundColor: hasFilters ? theme.accent : "transparent", paddingHorizontal: 12, paddingVertical: 6 }}
          >
            <T variant="label" style={{ color: hasFilters ? theme.background : theme.muted, fontSize: 12 }}>{showFilters ? "Hide" : "Filters"}</T>
          </TouchableOpacity>
        }
      />

      {expand.render && (
      <Animated.View style={expand.outerStyle}>
      <Animated.View style={expand.innerStyle}>
        <View onLayout={expand.onContentLayout}>
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
              <TouchableOpacity onPress={() => { setCatSearchQuery(""); setCatSearchVisible(true); }} style={{ borderWidth: 2, borderColor: categoryFilter ? theme.accent : theme.muted, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, alignItems: "center", justifyContent: "center", backgroundColor: categoryFilter ? theme.accent : "transparent" }}>
                <MaterialCommunityIcons name="filter-variant" size={14} color={categoryFilter ? theme.background : theme.muted} />
              </TouchableOpacity>
              <FilterChip label="All" active={!categoryFilter} onPress={() => setCategoryFilter(null)} />
              {typeCats?.map((c) => (
                <FilterChip key={c.id} label={c.name} active={categoryFilter === c.id} onPress={() => setCategoryFilter(c.id === categoryFilter ? null : c.id)} />
              ))}
            </ScrollView>
          </View>

          {/* Search */}
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search presets" />
        </View>
      </Animated.View>
      </Animated.View>
      )}

      <AddFAB onPress={() => router.push("/preset-form")} />

      <ScrollView style={{ flex: 1 }}>
        {!filteredPresets || filteredPresets.length === 0 ? (
          <EmptyState message="No presets yet. Tap + to create one." />
        ) : filteredPresets.map((p, i) => {
          const cat = p.default_category_id ? catMap.get(p.default_category_id) : null;
          const isLast = i === filteredPresets.length - 1;
          return (
            <TouchableOpacity key={p.id} onPress={() => router.push({ pathname: "/preset-form", params: { id: p.id } })} activeOpacity={0.7} style={{ padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: isLast ? 0 : 1, borderBottomColor: theme.muted, borderStyle: "dashed" }}>
              <View style={{ flex: 1 }}>
                <T variant="body" style={{ fontSize: 16 }}>{p.name}</T>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <T variant="label" style={{ color: p.type === "income" ? theme.income : theme.expense, fontSize: 10 }}>{p.type}</T>
                  {cat && (
                    <>
                      <View style={{ width: 4, height: 4, backgroundColor: theme.muted }} />
                      <View style={{ width: 8, height: 8, backgroundColor: cat.color ?? theme.muted }} />
                      <T variant="label" style={{ fontSize: 10, color: theme.muted }}>{cat.name}</T>
                    </>
                  )}
                </View>
              </View>
              {p.default_amount != null && <T variant="mono" style={{ color: p.type === "income" ? theme.income : theme.expense, fontSize: 16 }}>{(p.default_amount / 100).toFixed(2)}</T>}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Category search modal */}
      <Modal transparent visible={catSearchVisible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setCatSearchVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: theme.backdrop, padding: 24, paddingTop: 80 }}>
          <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <TextInput
                style={modalSearchStyle}
                placeholder="Search"
                placeholderTextColor={theme.placeholder}
                value={catSearchQuery}
                onChangeText={setCatSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => setCatSearchVisible(false)} style={{ borderWidth: 2, borderColor: theme.muted, paddingHorizontal: 14, justifyContent: "center", marginLeft: 8 }}>
                <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>Close</T>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {typeCats?.filter((c) => c.name.toLowerCase().includes(catSearchQuery.toLowerCase())).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { setCategoryFilter(c.id === categoryFilter ? null : c.id); setCatSearchVisible(false); setCatSearchQuery(""); }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}
                >
                  <View style={{ width: 12, height: 12, backgroundColor: c.color ?? theme.muted, marginRight: 12 }} />
                  <T variant="body" style={{ fontSize: 16, color: categoryFilter === c.id ? theme.accent : theme.ink }}>{c.name}</T>
                  {categoryFilter === c.id && <T variant="label" style={{ color: theme.accent, marginLeft: "auto" }}>✓</T>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

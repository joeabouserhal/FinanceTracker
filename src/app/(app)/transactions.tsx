import { useState } from "react";
import { View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useTransactions, type TransactionFilters } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { TransactionRow } from "@/components/TransactionRow";
import { AnimatedFAB } from "@/components/AnimatedFAB";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpandCollapse } from "@/utils/animations";
import type { TransactionWithRelations } from "@/types/database";

type DateRange = "all" | "today" | "month" | "year" | "custom";
type TypeFilter = "all" | "income" | "expense";

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export default function TransactionsList() {
  const router = useRouter();
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters = { ...filters, type: typeFilter === "all" ? undefined : typeFilter };
  const { data: transactions, isLoading, refetch, isFetching } = useTransactions(activeFilters);
  const { data: categories } = useCategories();
  const { data: currencies } = useCurrencies();
  const grouped = groupByDate(transactions ?? []);

  const typeCats = typeFilter === "all" ? categories : categories?.filter((c) => c.type === typeFilter);

  const hasFilters = typeFilter !== "all" || filters.categoryId || filters.categoryIds?.length || filters.currencyId || dateRange !== "all";

  const [customVisible, setCustomVisible] = useState(false);
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());

  // Category filter modal
  const [catFilterVisible, setCatFilterVisible] = useState(false);
  const [catFilterQuery, setCatFilterQuery] = useState("");
  const [pendingCatIds, setPendingCatIds] = useState<string[]>(filters.categoryIds ?? []);

  const applyDateRange = (range: DateRange) => {
    if (range === "custom") { setCustomVisible(true); return; }
    setDateRange(range);
    const today = todayISO();
    setFilters((f) => {
      const { dateFrom, dateTo, ...rest } = f;
      switch (range) {
        case "today": return { ...rest, dateFrom: today, dateTo: today };
        case "month": return { ...rest, dateFrom: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01` };
        case "year": return { ...rest, dateFrom: `${new Date().getFullYear()}-01-01` };
        default: return rest;
      }
    });
  };

  const applyCustomRange = () => {
    if (customFrom > customTo) { setCustomFrom(customTo); setCustomTo(customFrom); }
    setDateRange("custom");
    setFilters((f) => ({ ...f, dateFrom: customFrom > customTo ? customTo : customFrom, dateTo: customFrom > customTo ? customFrom : customTo }));
    setCustomVisible(false);
  };

  const openCatFilter = () => {
    setPendingCatIds(filters.categoryIds ?? []);
    setCatFilterQuery("");
    setCatFilterVisible(true);
  };

  const togglePending = (id: string) => {
    setPendingCatIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const applyCatFilter = () => {
    setFilters((f) => ({ ...f, categoryId: undefined, categoryIds: pendingCatIds.length > 0 ? pendingCatIds : undefined }));
    setCatFilterVisible(false);
  };
  const searchCats = typeCats?.filter((c) => c.name.toLowerCase().includes(catFilterQuery.toLowerCase())) ?? [];

  const expand = useExpandCollapse(showFilters);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.background, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <T variant="title">Transactions</T>
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
              {(["all", "income", "expense"] as TypeFilter[]).map((t) => (
                <FilterChip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={typeFilter === t} onPress={() => { setTypeFilter(t); setFilters((f) => ({ ...f, categoryId: undefined, categoryIds: undefined })); }} />
              ))}
            </ScrollView>
          </View>

          {/* Category filter */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity onPress={openCatFilter} style={{ borderWidth: 2, borderColor: (filters.categoryIds?.length ?? 0) > 0 ? colors.accent : colors.muted, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, alignItems: "center", justifyContent: "center", backgroundColor: (filters.categoryIds?.length ?? 0) > 0 ? colors.accent : "transparent" }}>
                <MaterialCommunityIcons name="filter-variant" size={14} color={(filters.categoryIds?.length ?? 0) > 0 ? colors.background : colors.muted} />
              </TouchableOpacity>
              <FilterChip label="All" active={!filters.categoryId && !filters.categoryIds} onPress={() => setFilters((f) => ({ ...f, categoryId: undefined, categoryIds: undefined }))} />
              {typeCats?.map((c) => <FilterChip key={c.id} label={c.name} active={filters.categoryId === c.id} onPress={() => setFilters((f) => ({ ...f, categoryId: f.categoryId === c.id ? undefined : c.id, categoryIds: undefined }))} />)}
            </ScrollView>
          </View>

          {/* Currency filter */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <FilterChip label="All" active={!filters.currencyId} onPress={() => setFilters((f) => ({ ...f, currencyId: undefined }))} />
              {currencies?.map((c) => <FilterChip key={c.id} label={c.code} active={filters.currencyId === c.id} onPress={() => setFilters((f) => ({ ...f, currencyId: f.currencyId === c.id ? undefined : c.id }))} />)}
            </ScrollView>
          </View>

          {/* Date range */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(["all", "today", "month", "year", "custom"] as DateRange[]).map((r) => (
                <FilterChip key={r} label={r.charAt(0).toUpperCase() + r.slice(1)} active={dateRange === r} onPress={() => applyDateRange(r)} />
              ))}
            </ScrollView>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555", height: 44, paddingHorizontal: 10 }}>
              <MaterialCommunityIcons name="magnify" size={16} color={colors.muted} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, color: "#F5F1E8", fontSize: 15, fontFamily: "IBMPlexMono", paddingVertical: 0, textAlignVertical: "center", includeFontPadding: false }}
                placeholder="Search by title"
                placeholderTextColor="#333"
                value={filters.search ?? ""}
                onChangeText={(t) => setFilters((f) => ({ ...f, search: t || undefined }))}
              />
            </View>
            {(filters.search?.length ?? 0) > 0 && (
              <TouchableOpacity onPress={() => setFilters((f) => ({ ...f, search: undefined }))} style={{ borderWidth: 2, borderColor: colors.muted, paddingHorizontal: 12, height: 44, justifyContent: "center", marginLeft: 6 }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 16 }}>✕</T>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
      </Animated.View>
      )}

      <AnimatedFAB style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, backgroundColor: colors.accent, width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent }} onPress={() => router.push("/transaction-form")}>
        <T variant="heading" style={{ color: colors.background, fontSize: 28 }}>+</T>
      </AnimatedFAB>

      {isLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : Object.keys(grouped).length === 0 ? (
        <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, marginTop: 40, textAlign: "center" }}>No transactions found. Tap + to add one.</T>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={() => { if (isConnected) refetch(); }} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.background} />}>
          {Object.entries(grouped).map(([date, txns]) => (
            <View key={date} style={{ borderBottomWidth: 1, borderBottomColor: "#1A1A1A", paddingTop: 8, paddingBottom: 12 }}>
              <T variant="label" style={{ paddingHorizontal: 16, paddingVertical: 10 }}>{formatDateLabel(date)}</T>
              {txns.map((t, j) => <TransactionRow key={t.id} transaction={t} isLast={j === txns.length - 1} onPress={() => router.push({ pathname: "/transaction-form", params: { id: t.id } })} />)}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Custom date modal */}
      <Modal transparent visible={customVisible} animationType="fade" onRequestClose={() => setCustomVisible(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 24 }}>
          <View style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 24, width: "100%", maxWidth: 320 }}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 20 }}>Custom Range</T>
            <T variant="label">From</T>
            <TextInput style={inputStyle} placeholder="YYYY-MM-DD" placeholderTextColor="#333" value={customFrom} onChangeText={setCustomFrom} />
            <T variant="label" style={{ marginTop: 12 }}>To</T>
            <TextInput style={inputStyle} placeholder="YYYY-MM-DD" placeholderTextColor="#333" value={customTo} onChangeText={setCustomTo} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setCustomVisible(false)} style={{ flex: 1, borderWidth: 2, borderColor: colors.muted, paddingVertical: 12, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyCustomRange} style={{ flex: 1, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingVertical: 12, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Apply</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category filter modal (multi-select) */}
      <Modal transparent visible={catFilterVisible} animationType="fade" onRequestClose={() => setCatFilterVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", padding: 24, paddingTop: 80 }}>
          <View style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 0, fontSize: 15, fontFamily: "IBMPlexMono", height: 44, textAlignVertical: "center", includeFontPadding: false }}
                placeholder="Search"
                placeholderTextColor="#333"
                value={catFilterQuery}
                onChangeText={setCatFilterQuery}
                autoFocus
              />
              <TouchableOpacity onPress={applyCatFilter} style={{ borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingHorizontal: 14, justifyContent: "center", marginLeft: 8 }}>
                <T variant="body" style={{ color: colors.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Done</T>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              <T variant="label" style={{ marginBottom: 8, color: colors.muted }}>Tap categories to select, then press Done</T>
              {typeCats?.filter((c) => c.name.toLowerCase().includes(catFilterQuery.toLowerCase())).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => togglePending(c.id)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}
                >
                  <View style={{ width: 12, height: 12, backgroundColor: c.color ?? colors.muted, marginRight: 12 }} />
                  <T variant="body" style={{ fontSize: 16, color: pendingCatIds.includes(c.id) ? colors.accent : colors.ink }}>{c.name}</T>
                  <View style={{ width: 20, height: 20, borderWidth: 2, borderColor: pendingCatIds.includes(c.id) ? colors.accent : colors.muted, backgroundColor: pendingCatIds.includes(c.id) ? colors.accent : "transparent", marginLeft: "auto", alignItems: "center", justifyContent: "center" }}>
                    {pendingCatIds.includes(c.id) && <T variant="body" style={{ color: colors.background, fontSize: 12 }}>✓</T>}
                  </View>
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
  return <TouchableOpacity onPress={onPress} style={{ borderWidth: 2, borderColor: active ? colors.accent : colors.muted, backgroundColor: active ? colors.accent : "transparent", paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 }}><T variant="label" style={{ color: active ? colors.background : colors.muted, fontSize: 12 }}>{label}</T></TouchableOpacity>;
}

function groupByDate(txns: TransactionWithRelations[]): Record<string, TransactionWithRelations[]> { const g: Record<string, TransactionWithRelations[]> = {}; for (const t of txns) { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); } return g; }

function formatDateLabel(dateStr: string): string { const d = new Date(dateStr + "T00:00:00"); const now = new Date(); const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); if (dateStr === now.toISOString().slice(0, 10)) return "Today"; if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday"; return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }

const inputStyle = { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555555", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontFamily: "IBMPlexMono" };

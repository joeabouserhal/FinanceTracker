import { useState } from "react";
import { View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useTransactions, type TransactionFilters } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { TransactionRow } from "@/components/TransactionRow";
import { AddFAB } from "@/components/AddFAB";
import { DateField } from "@/components/DateField";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FilterChip } from "@/components/FilterChip";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { T } from "@/components/ThemedText";
import { useTheme } from "@/theme/store";
import { useModalSearchStyle } from "@/theme/styles";
import { todayISO } from "@/utils/date";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useExpandCollapse } from "@/utils/animations";
import type { TransactionWithRelations } from "@/types/database";

type DateRange = "all" | "today" | "month" | "year" | "custom";
type TypeFilter = "all" | "income" | "expense";

export default function TransactionsList() {
  const router = useRouter();
  const theme = useTheme();
  const modalSearchStyle = useModalSearchStyle();
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters = { ...filters, type: typeFilter === "all" ? undefined : typeFilter };
  const { data: transactions, isLoading, refetch } = useTransactions(activeFilters);
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
  const expand = useExpandCollapse(showFilters);
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenHeader
        title="Transactions"
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
              {(["all", "income", "expense"] as TypeFilter[]).map((t) => (
                <FilterChip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={typeFilter === t} onPress={() => { setTypeFilter(t); setFilters((f) => ({ ...f, categoryId: undefined, categoryIds: undefined })); }} />
              ))}
            </ScrollView>
          </View>

          {/* Category filter */}
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity onPress={openCatFilter} style={{ borderWidth: 2, borderColor: (filters.categoryIds?.length ?? 0) > 0 ? theme.accent : theme.muted, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, alignItems: "center", justifyContent: "center", backgroundColor: (filters.categoryIds?.length ?? 0) > 0 ? theme.accent : "transparent" }}>
                <MaterialCommunityIcons name="filter-variant" size={14} color={(filters.categoryIds?.length ?? 0) > 0 ? theme.background : theme.muted} />
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
          <SearchInput value={filters.search ?? ""} onChangeText={(t) => setFilters((f) => ({ ...f, search: t || undefined }))} placeholder="Search by title" />
        </View>
      </Animated.View>
      </Animated.View>
      )}

      <AddFAB onPress={() => router.push("/transaction-form")} />

      {isLoading ? <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} /> : Object.keys(grouped).length === 0 ? (
        <EmptyState message="No transactions found. Tap + to add one." />
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={() => { if (isConnected) refetch(); }} tintColor={theme.accent} colors={[theme.accent]} progressBackgroundColor={theme.background} />}>
          {Object.entries(grouped).map(([date, txns]) => (
            <View key={date} style={{ borderBottomWidth: 1, borderBottomColor: theme.border, paddingTop: 8, paddingBottom: 12 }}>
              <T variant="label" style={{ paddingHorizontal: 16, paddingVertical: 10 }}>{formatDateLabel(date)}</T>
              {txns.map((t, j) => <TransactionRow key={t.id} transaction={t} isLast={j === txns.length - 1} onPress={() => router.push({ pathname: "/transaction-form", params: { id: t.id } })} />)}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Custom date modal */}
      <Modal transparent visible={customVisible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setCustomVisible(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.backdrop, padding: 24 }}>
          <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 320 }}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 20 }}>Custom Range</T>
            <T variant="label">From</T>
            <DateField value={customFrom} onChange={setCustomFrom} style={{ marginTop: 8 }} />
            <T variant="label" style={{ marginTop: 12 }}>To</T>
            <DateField value={customTo} onChange={setCustomTo} style={{ marginTop: 8 }} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setCustomVisible(false)} style={{ flex: 1, borderWidth: 2, borderColor: theme.muted, paddingVertical: 12, alignItems: "center" }}>
                <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyCustomRange} style={{ flex: 1, borderWidth: 2, borderColor: theme.accent, backgroundColor: theme.accent, paddingVertical: 12, alignItems: "center" }}>
                <T variant="body" style={{ color: theme.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Apply</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category filter modal (multi-select) */}
      <Modal transparent visible={catFilterVisible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setCatFilterVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: theme.backdrop, padding: 24, paddingTop: 80 }}>
          <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <TextInput
                style={modalSearchStyle}
                placeholder="Search"
                placeholderTextColor={theme.placeholder}
                value={catFilterQuery}
                onChangeText={setCatFilterQuery}
                autoFocus
              />
              <TouchableOpacity onPress={applyCatFilter} style={{ borderWidth: 2, borderColor: theme.accent, backgroundColor: theme.accent, paddingHorizontal: 14, justifyContent: "center", marginLeft: 8 }}>
                <T variant="body" style={{ color: theme.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Done</T>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              <T variant="label" style={{ marginBottom: 8, color: theme.muted }}>Tap categories to select, then press Done</T>
              {typeCats?.filter((c) => c.name.toLowerCase().includes(catFilterQuery.toLowerCase())).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => togglePending(c.id)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}
                >
                  <View style={{ width: 12, height: 12, backgroundColor: c.color ?? theme.muted, marginRight: 12 }} />
                  <T variant="body" style={{ fontSize: 16, color: pendingCatIds.includes(c.id) ? theme.accent : theme.ink }}>{c.name}</T>
                  <View style={{ width: 20, height: 20, borderWidth: 2, borderColor: pendingCatIds.includes(c.id) ? theme.accent : theme.muted, backgroundColor: pendingCatIds.includes(c.id) ? theme.accent : "transparent", marginLeft: "auto", alignItems: "center", justifyContent: "center" }}>
                    {pendingCatIds.includes(c.id) && <T variant="body" style={{ color: theme.background, fontSize: 12 }}>✓</T>}
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

function groupByDate(txns: TransactionWithRelations[]): Record<string, TransactionWithRelations[]> { const g: Record<string, TransactionWithRelations[]> = {}; for (const t of txns) { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); } return g; }

function formatDateLabel(dateStr: string): string { const d = new Date(dateStr + "T00:00:00"); const now = new Date(); const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); if (dateStr === now.toISOString().slice(0, 10)) return "Today"; if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday"; return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }

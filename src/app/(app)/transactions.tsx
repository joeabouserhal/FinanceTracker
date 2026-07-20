import { useState } from "react";
import { View, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTransactions, type TransactionFilters } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { TransactionRow } from "@/components/TransactionRow";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";
import type { TransactionWithRelations } from "@/types/database";

type DateRange = "all" | "today" | "month" | "year" | "custom";
type TypeFilter = "all" | "income" | "expense";

function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export default function TransactionsList() {
  const router = useRouter();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const activeFilters = { ...filters, type: typeFilter === "all" ? undefined : typeFilter };
  const { data: transactions, isLoading, refetch, isFetching } = useTransactions(activeFilters);
  const { data: categories } = useCategories();
  const grouped = groupByDate(transactions ?? []);

  const typeCats = typeFilter === "all" ? categories : categories?.filter((c) => c.type === typeFilter);

  const [customVisible, setCustomVisible] = useState(false);
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.background }}>
        <T variant="title">Transactions</T>
      </View>

      {/* Type filter */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(["all", "income", "expense"] as TypeFilter[]).map((t) => (
            <FilterChip key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} active={typeFilter === t} onPress={() => { setTypeFilter(t); setFilters((f) => ({ ...f, categoryId: undefined })); }} />
          ))}
        </ScrollView>
      </View>

      {/* Category filter */}
      <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterChip label="All" active={!filters.categoryId} onPress={() => setFilters((f) => ({ ...f, categoryId: undefined }))} />
          {typeCats?.map((c) => <FilterChip key={c.id} label={c.name} active={filters.categoryId === c.id} onPress={() => setFilters((f) => ({ ...f, categoryId: f.categoryId === c.id ? undefined : c.id }))} />)}
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

      <TouchableOpacity style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, backgroundColor: colors.accent, width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent }} onPress={() => router.push("/transaction-form")}>
        <T variant="heading" style={{ color: colors.background, fontSize: 28 }}>+</T>
      </TouchableOpacity>

      {isLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : Object.keys(grouped).length === 0 ? (
        <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, marginTop: 40, textAlign: "center" }}>No transactions found. Tap + to add one.</T>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.background} />}>
          {Object.entries(grouped).map(([date, txns]) => (
            <View key={date}>
              <T variant="label" style={{ paddingHorizontal: 16, paddingVertical: 8 }}>{formatDateLabel(date)}</T>
              {txns.map((t) => <TransactionRow key={t.id} transaction={t} onPress={() => router.push({ pathname: "/transaction-form", params: { id: t.id } })} />)}
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
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={{ borderWidth: 2, borderColor: active ? colors.accent : colors.muted, backgroundColor: active ? colors.accent : "transparent", paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 }}><T variant="label" style={{ color: active ? colors.background : colors.muted, fontSize: 12 }}>{label}</T></TouchableOpacity>;
}

function groupByDate(txns: TransactionWithRelations[]): Record<string, TransactionWithRelations[]> { const g: Record<string, TransactionWithRelations[]> = {}; for (const t of txns) { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); } return g; }

function formatDateLabel(dateStr: string): string { const d = new Date(dateStr + "T00:00:00"); const now = new Date(); const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); if (dateStr === now.toISOString().slice(0, 10)) return "Today"; if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday"; return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }

const inputStyle = { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555555", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontFamily: "IBMPlexMono" };

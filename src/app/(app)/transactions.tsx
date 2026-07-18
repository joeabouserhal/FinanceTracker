import { useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTransactions, type TransactionFilters } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { TransactionRow } from "@/components/TransactionRow";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";
import type { TransactionWithRelations } from "@/types/database";

export default function TransactionsList() {
  const router = useRouter();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const { data: transactions, isLoading, refetch, isFetching } = useTransactions(filters);
  const { data: categories } = useCategories();
  const grouped = groupByDate(transactions ?? []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, backgroundColor: colors.background }}>
        <T variant="title">Transactions</T>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <FilterChip label="All" active={!filters.categoryId} onPress={() => setFilters((f) => ({ ...f, categoryId: undefined }))} />
        {categories?.map((c) => <FilterChip key={c.id} label={c.name} active={filters.categoryId === c.id} onPress={() => setFilters((f) => ({ ...f, categoryId: f.categoryId === c.id ? undefined : c.id }))} />)}
      </ScrollView>

      <TouchableOpacity style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, backgroundColor: colors.accent, width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent }} onPress={() => router.push("/(app)/transaction-form")}>
        <T variant="heading" style={{ color: colors.background, fontSize: 28 }}>+</T>
      </TouchableOpacity>

      {isLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} /> : Object.keys(grouped).length === 0 ? (
        <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, marginTop: 40, textAlign: "center" }}>No transactions found. Tap + to add one.</T>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.background} />}>
          {Object.entries(grouped).map(([date, txns]) => (
            <View key={date}>
              <T variant="label" style={{ paddingHorizontal: 16, paddingVertical: 8 }}>{formatDateLabel(date)}</T>
              {txns.map((t) => <TransactionRow key={t.id} transaction={t} onPress={() => router.push({ pathname: "/(app)/transaction-form", params: { id: t.id } })} />)}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} style={{ borderWidth: 2, borderColor: active ? colors.accent : colors.muted, backgroundColor: active ? colors.accent : "transparent", paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 }}><T variant="label" style={{ color: active ? colors.background : colors.muted, fontSize: 13 }}>{label}</T></TouchableOpacity>;
}

function groupByDate(txns: TransactionWithRelations[]): Record<string, TransactionWithRelations[]> { const g: Record<string, TransactionWithRelations[]> = {}; for (const t of txns) { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); } return g; }

function formatDateLabel(dateStr: string): string { const d = new Date(dateStr + "T00:00:00"); const now = new Date(); const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); if (dateStr === now.toISOString().slice(0, 10)) return "Today"; if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday"; return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }); }

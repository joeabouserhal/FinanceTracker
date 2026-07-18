import { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrencies } from "@/hooks/useCurrencies";
import { T } from "@/components/ThemedText";
import { formatNumber } from "@/utils/currency";
import { colors } from "@/theme/colors";

export default function Reports() {
  const { data: currencies } = useCurrencies();
  const { data: transactions } = useTransactions();
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(currencies?.[0]?.id ?? null);
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const monthTxns = transactions?.filter((t) => t.date >= monthStart && (selectedCurrency ? t.currency_id === selectedCurrency : true)) ?? [];
  const byCategory: Record<string, { name: string; color: string; total: number; type: string }> = {};
  for (const t of monthTxns) { const cid = t.category_id; if (!byCategory[cid]) byCategory[cid] = { name: t.category?.name ?? "Unknown", color: t.category?.color ?? colors.muted, total: 0, type: t.category?.type ?? "expense" }; byCategory[cid].total += t.amount; }
  const sorted = Object.values(byCategory).sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...sorted.map((s) => s.total), 1);
  const selectedCurr = currencies?.find((c) => c.id === selectedCurrency);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, backgroundColor: colors.background }}>
        <T variant="title" style={{ marginBottom: 4 }}>Reports</T>
        <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>Spending by category this month</T>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: "row", marginBottom: 20, gap: 8 }}>
          {currencies?.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setSelectedCurrency(c.id)} style={{ borderWidth: 2, borderColor: selectedCurrency === c.id ? colors.accent : colors.muted, backgroundColor: selectedCurrency === c.id ? colors.accent : "transparent", paddingHorizontal: 14, paddingVertical: 6 }}>
              <T variant="label" style={{ color: selectedCurrency === c.id ? colors.background : colors.muted, fontSize: 13 }}>{c.code}</T>
            </TouchableOpacity>
          ))}
        </View>

        {sorted.length === 0 ? (
          <T variant="body" style={{ color: colors.muted, fontSize: 14, marginTop: 20 }}>No transactions this month</T>
        ) : sorted.map((s) => (
          <View key={s.name} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}><T variant="body" style={{ fontSize: 13 }}>{s.name}</T><T variant="mono" style={{ color: s.type === "income" ? colors.income : colors.expense, fontSize: 13 }}>{selectedCurr?.symbol ?? "$"}{formatNumber(s.total / 100, 2)}</T></View>
            <View style={{ height: 16, borderWidth: 2, borderColor: colors.muted }}><View style={{ height: "100%", width: `${(s.total / maxTotal) * 100}%`, backgroundColor: s.type === "income" ? colors.income : colors.expense }} /></View>
          </View>
        ))}

        {sorted.length > 0 && (
          <View style={{ marginTop: 24, borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: 16 }}>
            <T variant="label" style={{ marginBottom: 8 }}>Summary</T>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}><T variant="body" style={{ fontSize: 14 }}>Total Income</T><T variant="mono" style={{ color: colors.income, fontSize: 14 }}>{selectedCurr?.symbol ?? "$"}{formatNumber(sorted.filter((s) => s.type === "income").reduce((sum, s) => sum + s.total, 0) / 100, 2)}</T></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}><T variant="body" style={{ fontSize: 14 }}>Total Expenses</T><T variant="mono" style={{ color: colors.expense, fontSize: 14 }}>{selectedCurr?.symbol ?? "$"}{formatNumber(sorted.filter((s) => s.type === "expense").reduce((sum, s) => sum + s.total, 0) / 100, 2)}</T></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8, borderTopWidth: 1, borderTopColor: colors.muted, paddingTop: 8, borderStyle: "dashed" }}><T variant="body" style={{ fontSize: 16, fontWeight: "700" }}>Net</T><T variant="mono" style={{ fontSize: 16, fontWeight: "700" }}>{selectedCurr?.symbol ?? "$"}{formatNumber(sorted.reduce((sum, s) => sum + (s.type === "income" ? s.total : -s.total), 0) / 100, 2)}</T></View>
          </View>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

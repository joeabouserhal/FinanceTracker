import { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrencies } from "@/hooks/useCurrencies";
import { T } from "@/components/ThemedText";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MonthNavigator } from "@/components/MonthNavigator";
import { MonthPickerModal } from "@/components/MonthPickerModal";
import { EmptyState } from "@/components/EmptyState";
import { useMonthNavigation } from "@/hooks/useMonthNavigation";
import { useTheme } from "@/theme/store";
import { formatNumber } from "@/utils/currency";
import { PieChart } from "react-native-gifted-charts";

function renderDot(color: string) {
  return <View style={{ width: 8, height: 8, backgroundColor: color, marginRight: 6 }} />;
}

export default function Reports() {
  const theme = useTheme();
  const { data: currencies } = useCurrencies();
  const { data: transactions } = useTransactions();
  const [chartType, setChartType] = useState<"expense" | "income">("expense");
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(currencies?.[0]?.id ?? null);
  const nav = useMonthNavigation();

  const [year, month] = nav.viewMonth.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDate = new Date(year, month, 0);
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;

  const monthTxns = transactions?.filter((t) =>
    t.date >= monthStart && t.date <= monthEnd &&
    (selectedCurrency ? t.currency_id === selectedCurrency : true) &&
    t.type === chartType
  ) ?? [];

  const byCategory: Record<string, { name: string; color: string; total: number }> = {};
  for (const t of monthTxns) {
    const cid = t.category_id;
    if (!byCategory[cid]) byCategory[cid] = { name: t.category?.name ?? "Unknown", color: t.category?.color ?? theme.muted, total: 0 };
    byCategory[cid].total += t.amount;
  }
  const sorted = Object.values(byCategory).sort((a, b) => b.total - a.total);
  const total = sorted.reduce((s, x) => s + x.total, 0);

  const chartData = sorted.map((s) => ({
    value: s.total / 100,
    color: s.color,
    text: total > 0 ? `${Math.round((s.total / total) * 100)}%` : "0%",
    label: s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name,
  }));

  const selectedCurr = currencies?.find((c) => c.id === selectedCurrency);
  const symbol = selectedCurr?.symbol ?? "$";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenHeader title="Reports" subtitle="Category breakdown by month" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        {/* Month Navigator */}
        <MonthNavigator nav={nav} style={{ paddingHorizontal: 0, marginBottom: 16, paddingBottom: 12 }} />

        {/* Type toggle */}
        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          {(["expense", "income"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setChartType(t)}
              style={{
                borderWidth: 2,
                borderColor: chartType === t ? (t === "income" ? theme.income : theme.expense) : theme.muted,
                backgroundColor: chartType === t ? (t === "income" ? theme.income : theme.expense) : "transparent",
                paddingHorizontal: 14, paddingVertical: 6, marginRight: 8,
              }}
            >
              <T variant="label" style={{ color: chartType === t ? theme.background : theme.muted, fontSize: 12 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</T>
            </TouchableOpacity>
          ))}
        </View>

        {/* Currency filter */}
        <View style={{ flexDirection: "row", marginBottom: 20 }}>
          {currencies?.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCurrency(c.id)}
              style={{
                borderWidth: 2,
                borderColor: selectedCurrency === c.id ? theme.accent : theme.muted,
                backgroundColor: selectedCurrency === c.id ? theme.accent : "transparent",
                paddingHorizontal: 14, paddingVertical: 6, marginRight: 8,
              }}
            >
              <T variant="label" style={{ color: selectedCurrency === c.id ? theme.background : theme.muted, fontSize: 12 }}>{c.code}</T>
            </TouchableOpacity>
          ))}
        </View>

        {sorted.length === 0 ? (
          <EmptyState message={`No ${chartType} transactions this month`} />
        ) : (
          <>
            {/* Donut Chart */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <PieChart
                donut
                innerRadius={60}
                radius={90}
                data={chartData}
                backgroundColor={theme.background}
                centerLabelComponent={() => (
                  <View style={{ alignItems: "center" }}>
                    <T variant="heading" style={{ fontSize: 18, color: chartType === "income" ? theme.income : theme.expense }}>
                      {symbol}{formatNumber(total / 100, 0)}
                    </T>
                    <T variant="label" style={{ fontSize: 10, color: theme.muted }}>total</T>
                  </View>
                )}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12, justifyContent: "center" }}>
                {sorted.map((s, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                    {renderDot(s.color)}
                    <T variant="label" style={{ fontSize: 11, color: theme.muted }}>{s.name}</T>
                  </View>
                ))}
              </View>
            </View>

            {/* Breakdown bars */}
            <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 }}>
              <T variant="label" style={{ marginBottom: 12 }}>Breakdown</T>
              {sorted.map((s) => (
                <View key={s.name} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <T variant="body" style={{ fontSize: 13 }}>{s.name}</T>
                    <T variant="mono" style={{ color: chartType === "income" ? theme.income : theme.expense, fontSize: 13 }}>
                      {symbol}{formatNumber(s.total / 100, 2)} ({total > 0 ? Math.round((s.total / total) * 100) : 0}%)
                    </T>
                  </View>
                  <View style={{ height: 8, backgroundColor: theme.border }}>
                    <View style={{ height: "100%", width: `${total > 0 ? (s.total / total) * 100 : 0}%`, backgroundColor: s.color }} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <MonthPickerModal visible={nav.pickerVisible} activeKey={nav.viewMonth} year={nav.pickerYear} onYearChange={nav.setPickerYear} onSelect={nav.selectMonth} onClose={nav.closePicker} />
    </View>
  );
}

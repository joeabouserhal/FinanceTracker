import { useState } from "react";
import { View, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useTransactions } from "@/hooks/useTransactions";
import { useCurrencies } from "@/hooks/useCurrencies";
import { T } from "@/components/ThemedText";
import { formatNumber } from "@/utils/currency";
import { colors } from "@/theme/colors";
import { PieChart } from "react-native-gifted-charts";

function renderDot(color: string) {
  return <View style={{ width: 8, height: 8, backgroundColor: color, marginRight: 6 }} />;
}

export default function Reports() {
  const { data: currencies } = useCurrencies();
  const { data: transactions } = useTransactions();
  const [chartType, setChartType] = useState<"expense" | "income">("expense");
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(currencies?.[0]?.id ?? null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, month] = viewMonth.split("-").map(Number);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEndDate = new Date(year, month, 0);
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}`;

  const goToPrevMonth = () => { const d = new Date(year, month - 1, 0); setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const goToNextMonth = () => { const d = new Date(year, month, 1); setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const isCurrentMonth = viewMonth === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = (() => { const d = new Date(year, month - 1, 1); return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }); })();

  const monthTxns = transactions?.filter((t) =>
    t.date >= monthStart && t.date <= monthEnd &&
    (selectedCurrency ? t.currency_id === selectedCurrency : true) &&
    t.type === chartType
  ) ?? [];

  const byCategory: Record<string, { name: string; color: string; total: number }> = {};
  for (const t of monthTxns) {
    const cid = t.category_id;
    if (!byCategory[cid]) byCategory[cid] = { name: t.category?.name ?? "Unknown", color: t.category?.color ?? colors.muted, total: 0 };
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.background }}>
        <T variant="title" style={{ marginBottom: 4 }}>Reports</T>
        <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>Category breakdown by month</T>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        {/* Month Navigator */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
          <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}><T variant="heading" style={{ color: colors.muted, fontSize: 18 }}>←</T></TouchableOpacity>
          <TouchableOpacity onPress={() => { setPickerYear(year); setPickerVisible(true); }} style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
            <T variant="heading" style={{ fontSize: 14, color: colors.ink }}>{monthLabel}</T>
          </TouchableOpacity>
          <TouchableOpacity onPress={isCurrentMonth ? undefined : goToNextMonth} style={{ padding: 4, opacity: isCurrentMonth ? 0.3 : 1 }}>
            <T variant="heading" style={{ color: colors.muted, fontSize: 18 }}>→</T>
          </TouchableOpacity>
        </View>

        {/* Type toggle */}
        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          {(["expense", "income"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setChartType(t)}
              style={{
                borderWidth: 2,
                borderColor: chartType === t ? (t === "income" ? colors.income : colors.expense) : colors.muted,
                backgroundColor: chartType === t ? (t === "income" ? colors.income : colors.expense) : "transparent",
                paddingHorizontal: 14, paddingVertical: 6, marginRight: 8,
              }}
            >
              <T variant="label" style={{ color: chartType === t ? colors.background : colors.muted, fontSize: 12 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</T>
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
                borderColor: selectedCurrency === c.id ? colors.accent : colors.muted,
                backgroundColor: selectedCurrency === c.id ? colors.accent : "transparent",
                paddingHorizontal: 14, paddingVertical: 6, marginRight: 8,
              }}
            >
              <T variant="label" style={{ color: selectedCurrency === c.id ? colors.background : colors.muted, fontSize: 12 }}>{c.code}</T>
            </TouchableOpacity>
          ))}
        </View>

        {sorted.length === 0 ? (
          <T variant="body" style={{ color: colors.muted, fontSize: 14, textAlign: "center", marginTop: 40 }}>
            No {chartType} transactions this month
          </T>
        ) : (
          <>
            {/* Donut Chart */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <PieChart
                donut
                innerRadius={60}
                radius={90}
                data={chartData}
                backgroundColor={colors.background}
                centerLabelComponent={() => (
                  <View style={{ alignItems: "center" }}>
                    <T variant="heading" style={{ fontSize: 18, color: chartType === "income" ? colors.income : colors.expense }}>
                      {symbol}{formatNumber(total / 100, 0)}
                    </T>
                    <T variant="label" style={{ fontSize: 10, color: colors.muted }}>total</T>
                  </View>
                )}
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 12, justifyContent: "center" }}>
                {sorted.map((s, i) => (
                  <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                    {renderDot(s.color)}
                    <T variant="label" style={{ fontSize: 11, color: colors.muted }}>{s.name}</T>
                  </View>
                ))}
              </View>
            </View>

            {/* Breakdown bars */}
            <View style={{ borderTopWidth: 1, borderTopColor: "#1A1A1A", paddingTop: 16 }}>
              <T variant="label" style={{ marginBottom: 12 }}>Breakdown</T>
              {sorted.map((s) => (
                <View key={s.name} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <T variant="body" style={{ fontSize: 13 }}>{s.name}</T>
                    <T variant="mono" style={{ color: chartType === "income" ? colors.income : colors.expense, fontSize: 13 }}>
                      {symbol}{formatNumber(s.total / 100, 2)} ({total > 0 ? Math.round((s.total / total) * 100) : 0}%)
                    </T>
                  </View>
                  <View style={{ height: 8, backgroundColor: "#1A1A1A" }}>
                    <View style={{ height: "100%", width: `${total > 0 ? (s.total / total) * 100 : 0}%`, backgroundColor: s.color }} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Month picker modal */}
      <Modal transparent visible={pickerVisible} animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", padding: 24 }}>
          <View style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 24, width: "100%", maxWidth: 300 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)} style={{ padding: 4 }}><T variant="heading" style={{ color: colors.muted, fontSize: 18 }}>←</T></TouchableOpacity>
              <T variant="heading" style={{ fontSize: 16, color: colors.ink }}>{pickerYear}</T>
              <TouchableOpacity
                onPress={() => { if (pickerYear < new Date().getFullYear()) setPickerYear((y) => y + 1); }}
                style={{ padding: 4, opacity: pickerYear >= new Date().getFullYear() ? 0.3 : 1 }}
              >
                <T variant="heading" style={{ color: colors.muted, fontSize: 18 }}>→</T>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(() => { const now = new Date(); const thisYear = now.getFullYear(); const thisMonth = now.getMonth() + 1; return Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                const isActive = year === pickerYear && month === m;
                const isFuture = pickerYear > thisYear || (pickerYear === thisYear && m > thisMonth);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => { if (!isFuture) { setViewMonth(`${pickerYear}-${String(m).padStart(2, "0")}`); setPickerVisible(false); } }}
                    style={{
                      width: "22%", paddingVertical: 10, alignItems: "center",
                      borderWidth: 2,
                      borderColor: isActive ? colors.accent : colors.muted,
                      backgroundColor: isActive ? colors.accent : "transparent",
                      opacity: isFuture ? 0.3 : 1,
                    }}
                  >
                    <T variant="label" style={{ color: isActive ? colors.background : colors.muted, fontSize: 13 }}>
                      {new Date(2000, m - 1).toLocaleDateString("en-US", { month: "short" })}
                    </T>
                  </TouchableOpacity>
                );
              }); })()}
            </View>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={{ marginTop: 16, borderWidth: 2, borderColor: colors.muted, paddingVertical: 10, alignItems: "center" }}>
              <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>Cancel</T>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

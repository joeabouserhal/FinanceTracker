import { T } from "@/components/ThemedText";
import { TransactionRow } from "@/components/TransactionRow";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useTransactions } from "@/hooks/useTransactions";
import { colors } from "@/theme/colors";
import { formatNumber } from "@/utils/currency";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";

function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(key: string) { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function monthBounds(key: string) { const [y, m] = key.split("-").map(Number); const start = `${y}-${String(m).padStart(2, "0")}-01`; const end = new Date(y, m, 0); return { start, end: `${y}-${String(m).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}` }; }

export default function Dashboard() {
  const router = useRouter();
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const { data: transactions, isLoading, refetch, isFetching } = useTransactions();
  const { data: currencies } = useCurrencies();
  const [viewMonth, setViewMonth] = useState(() => monthKey(new Date()));

  const goToPrevMonth = () => { const [y, m] = viewMonth.split("-").map(Number); setViewMonth(monthKey(new Date(y, m - 2, 1))); };
  const goToNextMonth = () => { const [y, m] = viewMonth.split("-").map(Number); const d = monthKey(new Date(y, m, 1)); const now = monthKey(new Date()); if (d <= now) setViewMonth(d); };
  const isCurrentMonth = viewMonth === monthKey(new Date());
  const bounds = monthBounds(viewMonth);

  const monthTxns = useMemo(() => transactions?.filter((t) => t.date >= bounds.start && t.date <= bounds.end) ?? [], [transactions, bounds.start, bounds.end]);

  const currencyTotals: Record<string, { code: string; symbol: string; income: number; expense: number }> = {};
  for (const t of monthTxns) { const c = t.currency; if (!c) continue; if (!currencyTotals[c.id]) currencyTotals[c.id] = { code: c.code, symbol: c.symbol, income: 0, expense: 0 }; if (t.type === "income") currencyTotals[c.id].income += t.amount; else currencyTotals[c.id].expense += t.amount; }

  const allTime: Record<string, { code: string; symbol: string; net: number }> = {};
  for (const t of transactions ?? []) { const c = t.currency; if (!c) continue; if (!allTime[c.id]) allTime[c.id] = { code: c.code, symbol: c.symbol, net: 0 }; allTime[c.id].net += t.type === "income" ? t.amount : -t.amount; }

  const recentAll = transactions?.slice(0, 8) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.background }}>
        <T variant="title">Finances</T>
      </View>

      {!isConnected && (
        <View style={{ backgroundColor: colors.accent, paddingVertical: 4, alignItems: "center" }}>
          <T variant="mono" style={{ color: colors.background, fontSize: 11 }}>OFFLINE — changes saved locally</T>
        </View>
      )}

      <TouchableOpacity
        style={{ position: "absolute", bottom: 24, right: 24, zIndex: 10, backgroundColor: colors.accent, width: 56, height: 56, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.accent }}
        onPress={() => router.push("/transaction-form")}
      >
        <T variant="heading" style={{ color: colors.background, fontSize: 28 }}>+</T>
      </TouchableOpacity>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.background} />}
      >
        {/* Balance */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
          <T variant="label" style={{ marginBottom: 12 }}>Balance</T>
          {Object.keys(allTime).length === 0 ? (
            <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>No transactions yet</T>
          ) : (
            Object.values(allTime).map((c) => (
              <View key={c.code} style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 8 }}>
                <T variant="mono" style={{ fontSize: 14, color: colors.muted, minWidth: 40, textAlign: "right", marginRight: 8 }} numberOfLines={1}>{c.symbol}</T>
                <T variant="mono" style={{ fontSize: 36, lineHeight: 40 }} numberOfLines={1}>{formatNumber(c.net / 100, c.net % 100 === 0 ? 0 : 2)}</T>
              </View>
            ))
          )}
        </View>

        {/* Month Navigator */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
          <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}><T variant="heading" style={{ color: colors.muted, fontSize: 18 }}>←</T></TouchableOpacity>
          <T variant="heading" style={{ fontSize: 14, color: colors.ink }}>{monthLabel(viewMonth)}</T>
          <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }} disabled={isCurrentMonth}><T variant="heading" style={{ color: isCurrentMonth ? "#1A1A1A" : colors.muted, fontSize: 18 }}>→</T></TouchableOpacity>
        </View>

        {/* Month Activity */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
          <T variant="label" style={{ marginBottom: 12 }}>Activity</T>
          {Object.keys(currencyTotals).length === 0 ? (
            <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>No activity this month</T>
          ) : (
            Object.values(currencyTotals).map((c) => (
              <View key={c.code} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", height: 24, marginBottom: 4 }}>
                  {c.income > 0 && <View style={{ flex: c.income, backgroundColor: colors.income, height: "100%", justifyContent: "center", paddingHorizontal: 6 }}><T variant="mono" style={{ color: colors.background, fontSize: 11 }}>+{c.symbol}{formatNumber(c.income / 100, 0)}</T></View>}
                  {c.expense > 0 && <View style={{ flex: c.expense, backgroundColor: colors.expense, height: "100%", justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 6 }}><T variant="mono" style={{ color: colors.background, fontSize: 11 }}>-{c.symbol}{formatNumber(c.expense / 100, 0)}</T></View>}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <T variant="mono" style={{ color: colors.income, fontSize: 12 }}>+{c.symbol}{formatNumber(c.income / 100, 2)}</T>
                    <T variant="mono" style={{ color: colors.expense, fontSize: 12 }}>-{c.symbol}{formatNumber(c.expense / 100, 2)}</T>
                  </View>
                  <T variant="mono" style={{ fontSize: 12, color: (c.income - c.expense) >= 0 ? colors.income : colors.expense }}>{(c.income - c.expense) >= 0 ? "+" : ""}{c.symbol}{formatNumber(Math.abs(c.income - c.expense) / 100, 2)}</T>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Transactions */}
        <View style={{ paddingVertical: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}>
            <T variant="label">Recent</T>
            <TouchableOpacity onPress={() => router.push("/(app)/transactions")}><T variant="body" style={{ color: colors.accent, fontSize: 12 }}>See All</T></TouchableOpacity>
          </View>
          {isLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> : recentAll.length === 0 ? <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, fontSize: 14 }}>No transactions yet. Tap Transact to add one.</T> : recentAll.map((t) => <TransactionRow key={t.id} transaction={t} onPress={() => router.push({ pathname: "/transaction-form", params: { id: t.id } })} />)}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

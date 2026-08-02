import { T } from "@/components/ThemedText";
import { TransactionRow } from "@/components/TransactionRow";
import { AddFAB } from "@/components/AddFAB";
import { ScreenHeader } from "@/components/ScreenHeader";
import { MonthNavigator } from "@/components/MonthNavigator";
import { MonthPickerModal } from "@/components/MonthPickerModal";
import { EmptyState } from "@/components/EmptyState";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useTransactions } from "@/hooks/useTransactions";
import { useSyncStore } from "@/components/OfflineSyncProvider";
import { useMonthNavigation } from "@/hooks/useMonthNavigation";
import { useTheme } from "@/theme/store";
import { formatNumber } from "@/utils/currency";
import { useRouter } from "expo-router";
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";

export default function Dashboard() {
  const router = useRouter();
  const theme = useTheme();
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const syncError = useSyncStore((s) => s.lastError);
  const syncPending = useSyncStore((s) => s.pendingCount);
  const { data: transactions, isLoading, refetch } = useTransactions();
  const { data: currencies } = useCurrencies();
  const nav = useMonthNavigation();

  const { data: monthTransactions } = useTransactions({ dateFrom: nav.bounds.start, dateTo: nav.bounds.end });
  const monthTxns = monthTransactions ?? [];

  const currencyTotals: Record<string, { code: string; symbol: string; income: number; expense: number }> = {};
  for (const t of monthTxns) { const c = t.currency; if (!c) continue; if (!currencyTotals[c.id]) currencyTotals[c.id] = { code: c.code, symbol: c.symbol, income: 0, expense: 0 }; if (t.type === "income") currencyTotals[c.id].income += t.amount; else currencyTotals[c.id].expense += t.amount; }

  const allTime: Record<string, { code: string; symbol: string; net: number }> = {};
  for (const t of transactions ?? []) { const c = t.currency; if (!c) continue; if (!allTime[c.id]) allTime[c.id] = { code: c.code, symbol: c.symbol, net: 0 }; allTime[c.id].net += t.type === "income" ? t.amount : -t.amount; }

  const defaultCurrencyId = currencies?.find((currency) => currency.is_default)?.id;
  const defaultCurrencyCode = currencies?.find((c) => c.is_default)?.code;
  const recentAll = transactions?.slice(0, 8) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenHeader title="Finances" />

      {!isConnected && (
        <View style={{ backgroundColor: theme.accent, paddingVertical: 4, alignItems: "center" }}>
          <T variant="mono" style={{ color: theme.background, fontSize: 11 }}>OFFLINE — changes saved locally</T>
        </View>
      )}
      {syncError && isConnected && (
        <View style={{ backgroundColor: theme.expense, paddingVertical: 4, alignItems: "center" }}>
          <T variant="mono" style={{ color: theme.background, fontSize: 11 }}>SYNC FAILED</T>
        </View>
      )}
      {syncPending > 0 && isConnected && !syncError && (
        <View style={{ backgroundColor: theme.accent, paddingVertical: 4, alignItems: "center" }}>
          <T variant="mono" style={{ color: theme.background, fontSize: 11 }}>SYNCING {syncPending} changes...</T>
        </View>
      )}

      <AddFAB onPress={() => router.push("/transaction-form")} />

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { if (isConnected) refetch(); }} tintColor={theme.accent} colors={[theme.accent]} progressBackgroundColor={theme.background} />}
      >
        {/* Balance */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <T variant="label" style={{ marginBottom: 12 }}>Balance</T>
          {Object.keys(allTime).length === 0 ? (
            <EmptyState message="No transactions yet" style={{ marginTop: 0 }} />
          ) : (
            Object.entries(allTime)
              .sort(([idA, currencyA], [idB, currencyB]) => {
                if (idA === defaultCurrencyId) return -1;
                if (idB === defaultCurrencyId) return 1;
                return currencyA.code.localeCompare(currencyB.code);
              })
              .map(([, c]) => {
              const isNegative = c.net < 0;
              return (
                <View key={c.code} style={{ flexDirection: "row", alignItems: "baseline", marginBottom: 8 }}>
                  <T variant="label" style={{ color: theme.muted, fontSize: 14, width: 30, textAlign: "right", marginRight: 6 }}>{c.symbol}</T>
                  <T variant="mono" style={{ flex: 1, color: isNegative ? theme.expense : theme.ink, fontSize: 36, lineHeight: 40 }} numberOfLines={1} adjustsFontSizeToFit>
                    {isNegative ? "−" : "\u00A0"}{formatNumber(Math.abs(c.net) / 100, Math.abs(c.net) % 100 === 0 ? 0 : 2)}
                  </T>
                </View>
              );
            })
          )}
        </View>

        {/* Month Navigator */}
        <MonthNavigator nav={nav} />

        {/* Month Activity */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <T variant="label" style={{ marginBottom: 12 }}>Activity</T>
          {Object.keys(currencyTotals).length === 0 ? (
            <EmptyState message="No activity this month" style={{ marginTop: 0 }} />
          ) : (
            Object.values(currencyTotals).sort((a, b) => {
              if (a.code === defaultCurrencyCode) return -1;
              if (b.code === defaultCurrencyCode) return 1;
              return 0;
            }).map((c) => (
              <View key={c.code} style={{ marginBottom: 12 }}>
                <T variant="label" style={{ fontSize: 9, marginBottom: 4 }}>{c.code}</T>
                <View style={{ flexDirection: "row", height: 24, marginBottom: 4 }}>
                  {c.income > 0 && <View style={{ flex: c.income, backgroundColor: theme.income, height: "100%", justifyContent: "center", paddingHorizontal: 6 }}><T variant="mono" style={{ color: theme.background, fontSize: 11 }}>{Math.round(c.income / (c.income + c.expense) * 100)}%</T></View>}
                  {c.expense > 0 && <View style={{ flex: c.expense, backgroundColor: theme.expense, height: "100%", justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 6 }}><T variant="mono" style={{ color: theme.background, fontSize: 11 }}>{Math.round(c.expense / (c.income + c.expense) * 100)}%</T></View>}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <T variant="mono" style={{ color: theme.income, fontSize: 12 }}>+{c.symbol}{formatNumber(c.income / 100, 2)}</T>
                  <T variant="mono" style={{ color: theme.expense, fontSize: 12 }}>-{c.symbol}{formatNumber(c.expense / 100, 2)}</T>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Transactions */}
        <View style={{ paddingVertical: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 }}>
            <T variant="label">Recent</T>
            <TouchableOpacity onPress={() => router.push("/(app)/transactions")}><T variant="body" style={{ color: theme.accent, fontSize: 12 }}>See All</T></TouchableOpacity>
          </View>
          {isLoading ? <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} /> : recentAll.length === 0 ? <EmptyState message="No transactions yet. Tap + to add one." /> : recentAll.map((t, i) => <TransactionRow key={t.id} transaction={t} isLast={i === recentAll.length - 1} onPress={() => router.push({ pathname: "/transaction-form", params: { id: t.id } })} />)}
        </View>
        <View style={{ height: 80 }} />
      </ScrollView>

      <MonthPickerModal visible={nav.pickerVisible} activeKey={nav.viewMonth} year={nav.pickerYear} onYearChange={nav.setPickerYear} onSelect={nav.selectMonth} onClose={nav.closePicker} />
    </View>
  );
}

import { T } from "@/components/ThemedText";
import { TransactionRow } from "@/components/TransactionRow";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useTransactions } from "@/hooks/useTransactions";
import { useSyncStore } from "@/components/OfflineSyncProvider";
import { colors } from "@/theme/colors";
import { formatNumber } from "@/utils/currency";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View, Modal } from "react-native";

function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function monthLabel(key: string) { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); }
function monthBounds(key: string) { const [y, m] = key.split("-").map(Number); const start = `${y}-${String(m).padStart(2, "0")}-01`; const end = new Date(y, m, 0); return { start, end: `${y}-${String(m).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}` }; }

export default function Dashboard() {
  const router = useRouter();
  const isConnected = useNetworkStatus((s) => s.isConnected);
  const syncError = useSyncStore((s) => s.lastError);
  const syncPending = useSyncStore((s) => s.pendingCount);
  const { data: transactions, isLoading, refetch } = useTransactions();
  const { data: currencies } = useCurrencies();
  const [viewMonth, setViewMonth] = useState(() => monthKey(new Date()));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const goToPrevMonth = () => { const [y, m] = viewMonth.split("-").map(Number); setViewMonth(monthKey(new Date(y, m - 2, 1))); };
  const goToNextMonth = () => { const [y, m] = viewMonth.split("-").map(Number); const d = monthKey(new Date(y, m, 1)); const now = monthKey(new Date()); if (d <= now) setViewMonth(d); };
  const isCurrentMonth = viewMonth === monthKey(new Date());
  const bounds = monthBounds(viewMonth);

  const monthTxns = useMemo(() => transactions?.filter((t) => t.date >= bounds.start && t.date <= bounds.end) ?? [], [transactions, bounds.start, bounds.end]);

  const currencyTotals: Record<string, { code: string; symbol: string; income: number; expense: number }> = {};
  for (const t of monthTxns) { const c = t.currency; if (!c) continue; if (!currencyTotals[c.id]) currencyTotals[c.id] = { code: c.code, symbol: c.symbol, income: 0, expense: 0 }; if (t.type === "income") currencyTotals[c.id].income += t.amount; else currencyTotals[c.id].expense += t.amount; }

  const allTime: Record<string, { code: string; symbol: string; net: number }> = {};
  for (const t of transactions ?? []) { const c = t.currency; if (!c) continue; if (!allTime[c.id]) allTime[c.id] = { code: c.code, symbol: c.symbol, net: 0 }; allTime[c.id].net += t.type === "income" ? t.amount : -t.amount; }

  const defaultCurrencyId = currencies?.find((currency) => currency.is_default)?.id;
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
      {syncError && isConnected && (
        <View style={{ backgroundColor: colors.expense, paddingVertical: 4, alignItems: "center" }}>
          <T variant="mono" style={{ color: colors.background, fontSize: 11 }}>SYNC FAILED</T>
        </View>
      )}
      {syncPending > 0 && isConnected && !syncError && (
        <View style={{ backgroundColor: colors.accent, paddingVertical: 4, alignItems: "center" }}>
          <T variant="mono" style={{ color: colors.background, fontSize: 11 }}>SYNCING {syncPending} changes...</T>
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
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { if (isConnected) refetch(); }} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.background} />}
      >
        {/* Balance */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
          <T variant="label" style={{ marginBottom: 12 }}>Balance</T>
          {Object.keys(allTime).length === 0 ? (
            <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>No transactions yet</T>
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
                  <T variant="label" style={{ color: colors.muted, fontSize: 14, width: 30, textAlign: "right", marginRight: 6 }}>{c.symbol}</T>
                  <T variant="mono" style={{ flex: 1, color: isNegative ? colors.expense : colors.ink, fontSize: 36, lineHeight: 40 }} numberOfLines={1} adjustsFontSizeToFit>
                    {isNegative ? "−" : "\u00A0"}{formatNumber(Math.abs(c.net) / 100, Math.abs(c.net) % 100 === 0 ? 0 : 2)}
                  </T>
                </View>
              );
            })
          )}
        </View>

        {/* Month Navigator */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
          <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}><T variant="heading" style={{ color: colors.muted, fontSize: 18 }}>←</T></TouchableOpacity>
          <TouchableOpacity onPress={() => { const [y] = viewMonth.split("-").map(Number); setPickerYear(y); setPickerVisible(true); }} style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
            <T variant="heading" style={{ fontSize: 14, color: colors.ink }}>{monthLabel(viewMonth)}</T>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }} disabled={isCurrentMonth}><T variant="heading" style={{ color: isCurrentMonth ? "#1A1A1A" : colors.muted, fontSize: 18 }}>→</T></TouchableOpacity>
        </View>

        {/* Month Activity */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#1A1A1A" }}>
          <T variant="label" style={{ marginBottom: 12 }}>Activity</T>
          {Object.keys(currencyTotals).length === 0 ? (
            <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>No activity this month</T>
          ) : (
            Object.values(currencyTotals).sort((a, b) => {
              if (a.code === currencies?.find((c) => c.is_default)?.code) return -1;
              if (b.code === currencies?.find((c) => c.is_default)?.code) return 1;
              return 0;
            }).map((c) => (
              <View key={c.code} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", height: 24, marginBottom: 4 }}>
                  {c.income > 0 && <View style={{ flex: c.income, backgroundColor: colors.income, height: "100%", justifyContent: "center", paddingHorizontal: 6 }}><T variant="mono" style={{ color: colors.background, fontSize: 11 }}>{Math.round(c.income / (c.income + c.expense) * 100)}%</T></View>}
                  {c.expense > 0 && <View style={{ flex: c.expense, backgroundColor: colors.expense, height: "100%", justifyContent: "center", alignItems: "flex-end", paddingHorizontal: 6 }}><T variant="mono" style={{ color: colors.background, fontSize: 11 }}>{Math.round(c.expense / (c.income + c.expense) * 100)}%</T></View>}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <T variant="mono" style={{ color: colors.income, fontSize: 12 }}>+{c.symbol}{formatNumber(c.income / 100, 2)}</T>
                  <T variant="mono" style={{ color: colors.expense, fontSize: 12 }}>-{c.symbol}{formatNumber(c.expense / 100, 2)}</T>
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
          {isLoading ? <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} /> : recentAll.length === 0 ? <T variant="body" style={{ color: colors.muted, paddingHorizontal: 16, fontSize: 14 }}>No transactions yet. Tap Transact to add one.</T> : recentAll.map((t, i) => <TransactionRow key={t.id} transaction={t} isLast={i === recentAll.length - 1} onPress={() => router.push({ pathname: "/transaction-form", params: { id: t.id } })} />)}
        </View>
        <View style={{ height: 80 }} />
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
              {Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                const isActive = viewMonth === `${pickerYear}-${String(m).padStart(2, "0")}`;
                const now = monthKey(new Date());
                const monthStr = `${pickerYear}-${String(m).padStart(2, "0")}`;
                const isFuture = monthStr > now;
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => { if (!isFuture) { setViewMonth(monthStr); setPickerVisible(false); } }}
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
              })}
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

import { View, TouchableOpacity } from "react-native";
import type { TransactionWithRelations } from "@/types/database";
import { T } from "@/components/ThemedText";
import { formatNumber } from "@/utils/currency";
import { useTheme } from "@/theme/store";

interface Props {
  transaction: TransactionWithRelations;
  onPress?: () => void;
  isLast?: boolean;
}

export function TransactionRow({ transaction, onPress, isLast }: Props) {
  const theme = useTheme();
  const isIncome = transaction.type === "income";
  const symbol = transaction.currency?.symbol ?? "$";
  const amount = transaction.amount / 100;
  const sign = isIncome ? "+" : "-";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: theme.muted,
        borderStyle: "dashed",
      }}
    >
      <View style={{ width: 4, height: 40, backgroundColor: transaction.category?.color ?? theme.muted, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <T variant="body" style={{ fontSize: 14 }} numberOfLines={1}>{transaction.title || transaction.category?.name || "Unknown"}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <T variant="label" style={{ fontSize: 10, color: isIncome ? theme.income : theme.expense }}>{transaction.type}</T>
          {transaction.title && transaction.category && <><T variant="label" style={{ fontSize: 10, color: theme.muted }}>·</T><T variant="label" style={{ fontSize: 10, color: theme.muted }}>{transaction.category.name}</T></>}
        </View>
      </View>
      <T variant="mono" style={{ color: isIncome ? theme.income : theme.expense, fontSize: 16 }}>
        {sign}{symbol}{formatNumber(Math.abs(amount), amount % 1 === 0 ? 0 : 2)}
      </T>
    </TouchableOpacity>
  );
}

import { View } from "react-native";
import type { TransactionWithRelations } from "@/types/database";
import { T } from "@/components/ThemedText";
import { formatNumber } from "@/utils/currency";
import { colors } from "@/theme/colors";

interface Props {
  transaction: TransactionWithRelations;
  onPress?: () => void;
  isLast?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TransactionRow({ transaction, onPress, isLast }: Props) {
  const isIncome = transaction.type === "income";
  const symbol = transaction.currency?.symbol ?? "$";
  const amount = transaction.amount / 100;
  const sign = isIncome ? "+" : "-";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#77746C",
        borderStyle: "dashed",
      }}
      onTouchEnd={onPress}
    >
      <View style={{ width: 4, height: 40, backgroundColor: transaction.category?.color ?? colors.muted, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <T variant="body" style={{ fontSize: 14 }} numberOfLines={1}>{transaction.title || transaction.category?.name || "Unknown"}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <T variant="label" style={{ fontSize: 10, color: isIncome ? colors.income : colors.expense }}>{transaction.type}</T>
          {transaction.title && transaction.category && <><T variant="label" style={{ fontSize: 10, color: colors.muted }}>·</T><T variant="label" style={{ fontSize: 10, color: colors.muted }}>{transaction.category.name}</T></>}
        </View>
      </View>
      <T variant="mono" style={{ color: isIncome ? colors.income : colors.expense, fontSize: 16 }}>
        {sign}{symbol}{formatNumber(Math.abs(amount), amount % 1 === 0 ? 0 : 2)}
      </T>
    </View>
  );
}

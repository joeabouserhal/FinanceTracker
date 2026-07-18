import { View } from "react-native";
import type { TransactionWithRelations } from "@/types/database";
import { T } from "@/components/ThemedText";
import { formatNumber } from "@/utils/currency";
import { colors } from "@/theme/colors";

interface Props {
  transaction: TransactionWithRelations;
  onPress?: () => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TransactionRow({ transaction, onPress }: Props) {
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
        borderBottomWidth: 1,
        borderBottomColor: colors.muted,
        borderStyle: "dashed",
      }}
      onTouchEnd={onPress}
    >
      <View style={{ width: 4, height: 36, backgroundColor: transaction.category?.color ?? colors.muted, marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <T variant="body" style={{ fontSize: 14 }}>{transaction.category?.name ?? "Unknown"}</T>
        <T variant="body" style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{formatDate(transaction.date)}</T>
      </View>
      <T variant="mono" style={{ color: isIncome ? colors.income : colors.expense, fontSize: 16 }}>
        {sign}{symbol}{formatNumber(Math.abs(amount), amount % 1 === 0 ? 0 : 2)}
      </T>
    </View>
  );
}

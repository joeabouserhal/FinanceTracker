import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { usePresets } from "@/hooks/usePresets";
import {
  useAddTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useTransactions,
} from "@/hooks/useTransactions";
import { colors } from "@/theme/colors";
import type { TransactionInsert } from "@/types/database";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TransactionForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const { data: currencies } = useCurrencies();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: presets } = usePresets();
  const { data: transactions } = useTransactions();
  const addMutation = useAddTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const existing = isEdit ? transactions?.find((t) => t.id === id) : null;

  const [type, setType] = useState<"income" | "expense">(
    existing?.type ?? "expense",
  );
  const [amount, setAmount] = useState(
    existing ? String(existing.amount / 100) : "",
  );
  const [currencyId, setCurrencyId] = useState(
    existing?.currency_id ?? currencies?.find((c) => c.is_default)?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "");
  const [accountId, setAccountId] = useState(existing?.account_id ?? "");
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const filteredCategories =
    categories?.filter((c) => c.type === type) ?? [];

  const applyPreset = (presetId: string) => {
    const p = presets?.find((pr) => pr.id === presetId);
    if (!p) return;
    setType(p.type);
    if (p.default_amount != null) setAmount(String(p.default_amount / 100));
    if (p.default_currency_id) setCurrencyId(p.default_currency_id);
    if (p.default_category_id) setCategoryId(p.default_category_id);
    if (p.default_account_id) setAccountId(p.default_account_id);
  };

  const handleSave = async () => {
    if (!amount || !currencyId || !categoryId) {
      Alert.alert(
        "Missing fields",
        "Amount, currency, and category are required.",
      );
      return;
    }

    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      Alert.alert("Invalid amount", "Enter a valid positive amount.");
      return;
    }

    const data: TransactionInsert = {
      type,
      amount: amountCents,
      currency_id: currencyId,
      category_id: categoryId,
      account_id: accountId || null,
      date,
      notes: notes || null,
      preset_id: null,
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, ...data });
      } else {
        await addMutation.mutateAsync(data);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert("Delete", "Remove this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMutation.mutateAsync(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
        <Text
          style={{
            color: colors.ink,
            fontSize: 18,
            fontFamily: "ArchivoBlack",
          }}
        >
          {isEdit ? "Edit" : "New"} Transaction
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text
              style={{
                color: colors.accent,
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Preset picker (new transactions only) */}
      {!isEdit && presets && presets.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          {presets.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => applyPreset(p.id)}
              style={{
                borderWidth: 2,
                borderColor: colors.muted,
                paddingHorizontal: 14,
                paddingVertical: 6,
                marginRight: 8,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase" }}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Type toggle */}
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        {(["expense", "income"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
            style={{
              flex: 1,
              borderWidth: 2,
              borderColor:
                type === t
                  ? t === "income"
                    ? colors.income
                    : colors.expense
                  : colors.muted,
              backgroundColor:
                type === t
                  ? t === "income"
                    ? colors.income
                    : colors.expense
                  : "transparent",
              paddingVertical: 10,
              alignItems: "center",
              marginRight: t === "expense" ? 4 : 0,
              marginLeft: t === "income" ? 4 : 0,
            }}
          >
            <Text
              style={{
                color: type === t ? colors.background : colors.muted,
                fontSize: 14,
                textTransform: "uppercase",
                fontWeight: "700",
              }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount */}
      <Text style={s.label}>Amount</Text>
      <TextInput
        style={s.input}
        placeholder="0.00"
        placeholderTextColor={colors.muted}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Currency */}
      <Text style={[s.label, { marginTop: 16 }]}>Currency</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {currencies?.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setCurrencyId(c.id)}
            style={chipStyle(currencyId === c.id)}
          >
            <Text style={chipTextStyle(currencyId === c.id)}>{c.code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category */}
      <Text style={[s.label, { marginTop: 16 }]}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filteredCategories.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={[
              chipStyle(categoryId === c.id),
              categoryId === c.id && c.color
                ? { borderColor: c.color, backgroundColor: c.color }
                : {},
            ]}
          >
            <Text style={chipTextStyle(categoryId === c.id)}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Account */}
      <Text style={[s.label, { marginTop: 16 }]}>Account (optional)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TouchableOpacity
          onPress={() => setAccountId("")}
          style={chipStyle(!accountId)}
        >
          <Text style={chipTextStyle(!accountId)}>None</Text>
        </TouchableOpacity>
        {accounts
          ?.filter((a) => !a.archived)
          .map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setAccountId(a.id)}
              style={chipStyle(accountId === a.id)}
            >
              <Text style={chipTextStyle(accountId === a.id)}>{a.name}</Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* Date */}
      <Text style={[s.label, { marginTop: 16 }]}>Date</Text>
      <TextInput
        style={s.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.muted}
        value={date}
        onChangeText={setDate}
      />

      {/* Notes */}
      <Text style={[s.label, { marginTop: 16 }]}>Notes (optional)</Text>
      <TextInput
        style={[s.input, { minHeight: 60 }]}
        placeholder="What was this for?"
        placeholderTextColor={colors.muted}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      {isEdit && (
        <TouchableOpacity
          style={{
            borderWidth: 2,
            borderColor: colors.expense,
            paddingVertical: 12,
            alignItems: "center",
            marginTop: 32,
          }}
          onPress={handleDelete}
        >
          <Text
            style={{
              color: colors.expense,
              textTransform: "uppercase",
              fontSize: 14,
            }}
          >
            Delete Transaction
          </Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = {
  label: {
    color: "#F5F1E8",
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: "#0A0A0A",
    borderWidth: 2,
    borderColor: "#77746C",
    color: "#F5F1E8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
};

function chipStyle(active: boolean) {
  return {
    borderWidth: 2,
    borderColor: active ? colors.accent : colors.muted,
    backgroundColor: active ? colors.accent : "transparent",
    paddingHorizontal: 14,
    paddingVertical: 6,
  };
}

function chipTextStyle(active: boolean) {
  return {
    color: active ? colors.background : colors.muted,
    fontSize: 13,
    textTransform: "uppercase" as const,
  };
}

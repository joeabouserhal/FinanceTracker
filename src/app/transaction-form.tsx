import { useState, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
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
import { T } from "@/components/ThemedText";
import { ThemedAlert, ThemedConfirm } from "@/components/ThemedAlert";
import { colors } from "@/theme/colors";
import type { TransactionInsert } from "@/types/database";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addCommas(val: string): string {
  if (!val) return "";
  const negative = val.startsWith("-");
  const cleaned = (negative ? val.slice(1) : val).replace(/,/g, "");
  if (!cleaned) return negative ? "-" : "";
  const [int, frac] = cleaned.split(".");
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = frac !== undefined ? `${withCommas}.${frac}` : withCommas;
  return negative ? `-${result}` : result;
}

export default function TransactionForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate("/(app)/transactions");
    }
  };

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
    existing ? addCommas(String(existing.amount / 100)) : "",
  );
  const amountRef = useRef<TextInput>(null);
  const cursorPos = useRef(0);

  const [currencyId, setCurrencyId] = useState(
    existing?.currency_id ?? currencies?.find((c) => c.is_default)?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "");
  const [accountId, setAccountId] = useState(existing?.account_id ?? "");
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const filteredCategories =
    categories?.filter((c) => c.type === type) ?? [];

  const handleTypeChange = (t: "income" | "expense") => {
    setType(t);
    // Clear category if the selected one doesn't match the new type
    const selectedCat = categories?.find((c) => c.id === categoryId);
    if (selectedCat && selectedCat.type !== t) {
      setCategoryId("");
    }
  };

  const activeAccounts = accounts?.filter((a) => !a.archived) ?? [];
  const activeCurrency = currencies?.find((c) => c.id === currencyId);

  // Reset form when opening a new transaction, populate when editing
  useFocusEffect(
    useCallback(() => {
      if (!isEdit) {
        setAmount("");
        setCategoryId("");
        setAccountId("");
        setNotes("");
      } else if (existing) {
        setAmount(addCommas(String(existing.amount / 100)));
        setType(existing.type);
        setCurrencyId(existing.currency_id);
        setCategoryId(existing.category_id);
        setAccountId(existing.account_id ?? "");
        setDate(existing.date);
        setNotes(existing.notes ?? "");
      }
    }, [isEdit, existing?.id, existing?.amount, existing?.type, existing?.category_id, existing?.notes, existing?.date])
  );

  const handleAmountChange = (text: string) => {
    // Count commas before cursor in old value
    const oldText = amount;
    const oldCursor = cursorPos.current;
    const commasBeforeCursorOld = (oldText.slice(0, oldCursor).match(/,/g) || []).length;

    // Format new text
    const formatted = addCommas(text);

    // Count commas before cursor in new value
    // The cursor should be at: oldCursor - commasRemoved + commasAdded
    // Since we pass through addCommas, we can estimate:
    const adjusted = oldCursor + (formatted.length - oldText.length);

    setAmount(formatted);

    // Restore cursor after render
    setTimeout(() => {
      const newCursor = Math.min(Math.max(0, adjusted), formatted.length);
      amountRef.current?.setNativeProps({
        selection: { start: newCursor, end: newCursor },
      });
    }, 0);
  };

  const getRawAmount = () => parseFloat(amount.replace(/,/g, "")) || 0;

  const applyPreset = (presetId: string) => {
    const p = presets?.find((pr) => pr.id === presetId);
    if (!p) return;
    setType(p.type);
    if (p.default_amount != null) setAmount(addCommas(String(p.default_amount / 100)));
    if (p.default_currency_id) setCurrencyId(p.default_currency_id);
    if (p.default_category_id) setCategoryId(p.default_category_id);
    if (p.default_account_id) setAccountId(p.default_account_id);
  };

  const handleSave = async () => {
    const rawAmount = getRawAmount();
    if (!rawAmount || !currencyId || !categoryId) {
      showAlert("Missing fields", "Amount, currency, and category are required.");
      return;
    }

    const amountCents = Math.round(rawAmount * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      showAlert("Invalid amount", "Enter a valid positive amount.");
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
      goBack();
    } catch (e: any) {
      showAlert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    setConfirmVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 12,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity onPress={goBack}>
          <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>
            Cancel
          </T>
        </TouchableOpacity>
        <T variant="title">
          {isEdit ? "Edit Transaction" : "New Transaction"}
        </T>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <T
              variant="body"
              style={{
                color: colors.accent,
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              Save
            </T>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type toggle — full width, top */}
        <View style={{ flexDirection: "row", marginBottom: 16, paddingTop: 8 }}>
          {(["expense", "income"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => handleTypeChange(t)}
              style={{
                flex: 1,
                borderWidth: 2,
                borderColor: type === t ? (t === "income" ? colors.income : colors.expense) : colors.muted,
                backgroundColor: type === t ? (t === "income" ? colors.income : colors.expense) : "transparent",
                paddingVertical: 10,
                alignItems: "center",
                marginRight: t === "expense" ? 4 : 0,
                marginLeft: t === "income" ? 4 : 0,
              }}
            >
              <T variant="body" style={{ color: type === t ? colors.background : colors.muted, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>
                {t}
              </T>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preset picker (new transactions only) */}
        {!isEdit && presets && presets.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {presets.map((p) => (
              <TouchableOpacity key={p.id} onPress={() => applyPreset(p.id)} style={chipStyle(false)}>
                <T variant="label" style={{ color: colors.muted, fontSize: 12 }}>{p.name}</T>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Amount — Hero */}
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#1A1A1A", paddingVertical: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <T variant="mono" style={{ fontSize: 18, color: "#444", marginRight: 6 }}>
              {activeCurrency?.symbol ?? "$"}
            </T>
            <TextInput
              ref={amountRef}
              style={{ color: "#F5F1E8", fontSize: 48, fontFamily: "IBMPlexMono", flex: 1, padding: 0 }}
              placeholder="0"
              placeholderTextColor="#333"
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              onSelectionChange={(e) => {
                cursorPos.current = e.nativeEvent.selection.start;
              }}
            />
          </View>
        </View>

        {/* Category */}
        <T variant="label">Category</T>
        {!categories || filteredCategories.length === 0 ? (
          <T variant="body" style={{ color: colors.muted, fontSize: 12, marginTop: 8, marginBottom: 20 }}>
            {!categories ? "Loading..." : "No categories for this type. Go to Settings to add one."}
          </T>
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8, marginBottom: 20 }}
        >
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
              <T
                variant="label"
                style={{
                  color:
                    categoryId === c.id ? colors.background : colors.muted,
                  fontSize: 13,
                }}
              >
                {c.name}
              </T>
            </TouchableOpacity>
          ))}
        </ScrollView>
        )}

        {/* Currency */}
        <T variant="label">Currency</T>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
            marginBottom: 20,
          }}
        >
          {currencies?.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCurrencyId(c.id)}
              style={chipStyle(currencyId === c.id)}
            >
              <T
                variant="label"
                style={{
                  color:
                    currencyId === c.id ? colors.background : colors.muted,
                  fontSize: 13,
                }}
              >
                {c.code}
              </T>
            </TouchableOpacity>
          ))}
        </View>

        {/* Account */}
        <T variant="label">Account</T>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
            marginBottom: 20,
          }}
        >
          {activeAccounts.length === 0 ? (
            <T
              variant="body"
              style={{ color: colors.muted, fontSize: 12 }}
            >
              No accounts — go to Settings to add one
            </T>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setAccountId("")}
                style={chipStyle(!accountId)}
              >
                <T
                  variant="label"
                  style={{
                    color: !accountId ? colors.background : colors.muted,
                    fontSize: 13,
                  }}
                >
                  None
                </T>
              </TouchableOpacity>
              {activeAccounts.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setAccountId(a.id)}
                  style={chipStyle(accountId === a.id)}
                >
                  <T
                    variant="label"
                    style={{
                      color:
                        accountId === a.id
                          ? colors.background
                          : colors.muted,
                      fontSize: 13,
                    }}
                  >
                    {a.name}
                  </T>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: "#1A1A1A",
            marginBottom: 20,
          }}
        />

        {/* Date */}
        <T variant="label">Date</T>
        <TextInput
          style={inputStyle}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          value={date}
          onChangeText={setDate}
        />

        {/* Notes */}
        <T variant="label" style={{ marginTop: 16 }}>
          Notes
        </T>
        <TextInput
          style={[inputStyle, { minHeight: 60, marginTop: 8 }]}
          placeholder="What was this for?"
          placeholderTextColor={colors.muted}
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        {/* Delete (edit only) */}
        {isEdit && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: "#1A1A1A",
                marginTop: 32,
                marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                borderWidth: 2,
                borderColor: colors.expense,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <T
                variant="body"
                style={{
                  color: colors.expense,
                  textTransform: "uppercase",
                  fontSize: 14,
                }}
              >
                Delete
              </T>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      <ThemedAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onDismiss={() => setAlertVisible(false)}
      />
      <ThemedConfirm
        visible={confirmVisible}
        title="Delete"
        message="Remove this transaction?"
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setConfirmVisible(false);
          if (id) {
            await deleteMutation.mutateAsync(id);
            goBack();
          }
        }}
        onCancel={() => setConfirmVisible(false)}
      />
    </View>
  );
}

const inputStyle = {
  backgroundColor: "#0A0A0A",
  borderWidth: 2,
  borderColor: "#77746C",
  color: "#F5F1E8",
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 16,
  fontFamily: "IBMPlexSans",
  marginTop: 8,
};

function chipStyle(active: boolean) {
  return {
    borderWidth: 2,
    borderColor: active ? colors.accent : colors.muted,
    backgroundColor: active ? colors.accent : "transparent",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  };
}

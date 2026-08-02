import { ThemedAlert, ThemedConfirm } from "@/components/ThemedAlert";
import { T } from "@/components/ThemedText";
import { DateField } from "@/components/DateField";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { useCurrencies } from "@/hooks/useCurrencies";
import { usePresets } from "@/hooks/usePresets";
import {
  useAddTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "@/hooks/useTransactions";
import { useTheme } from "@/theme/store";
import { useInputStyle, useModalSearchStyle } from "@/theme/styles";
import { getErrorMessage } from "@/utils/errors";
import { todayISO } from "@/utils/date";
import type { TransactionInsert } from "@/types/database";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
} from "react-native";

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
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const modalSearchStyle = useModalSearchStyle();
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
  // Currencies may load after this screen mounts — derive the effective
  // selection in render so a fresh form still defaults to the default currency.
  const effectiveCurrencyId = currencyId || currencies?.find((c) => c.is_default)?.id || "";
  const [categoryId, setCategoryId] = useState(existing?.category_id ?? "");
  const [accountId, setAccountId] = useState(existing?.account_id ?? "");
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [catSearchVisible, setCatSearchVisible] = useState(false);
  const [catSearchQuery, setCatSearchQuery] = useState("");

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const chipStyle = (active: boolean) => ({
    borderWidth: 2,
    borderColor: active ? theme.accent : theme.muted,
    backgroundColor: active ? theme.accent : "transparent",
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  });

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
  const activeCurrency = currencies?.find((c) => c.id === effectiveCurrencyId);

  // Form state is initialized once from `existing` — expo-router remounts this
  // screen on every navigation, so no focus-sync effect is needed.

  const handleAmountChange = (text: string) => {
    // Remember cursor position in the old value for adjustment below
    const oldText = amount;
    const oldCursor = cursorPos.current;

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
    setTitle(p.name);
  };

  const handleSave = async () => {
    const rawAmount = getRawAmount();
    if (!rawAmount || !effectiveCurrencyId || !categoryId || !title.trim()) {
      showAlert("Missing fields", "Amount, currency, category, and title are required.");
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
      currency_id: effectiveCurrencyId,
      category_id: categoryId,
      account_id: accountId || null,
      date,
      title: title || null,
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
    } catch (e) {
      showAlert("Error", getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    setConfirmVisible(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Sticky Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 12,
          backgroundColor: theme.background,
        }}
      >
        <TouchableOpacity onPress={goBack}>
          <T variant="body" style={{ color: theme.muted, fontSize: 14 }}>
            Cancel
          </T>
        </TouchableOpacity>
        <T variant="heading" style={{ fontSize: 18 }}>
          {isEdit ? "Edit Transaction" : "New Transaction"}
        </T>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={theme.accent} />
          ) : (
            <T
              variant="body"
              style={{
                color: theme.accent,
                fontSize: 14,
                textTransform: "uppercase",
              }}
            >
              Save
            </T>
          )}
        </TouchableOpacity>
      </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
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
                borderColor: type === t ? (t === "income" ? theme.income : theme.expense) : theme.muted,
                backgroundColor: type === t ? (t === "income" ? theme.income : theme.expense) : "transparent",
                paddingVertical: 10,
                alignItems: "center",
                marginRight: t === "expense" ? 4 : 0,
                marginLeft: t === "income" ? 4 : 0,
              }}
            >
              <T variant="body" style={{ color: type === t ? theme.background : theme.muted, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>
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
                <T variant="label" style={{ color: theme.muted, fontSize: 12 }}>{p.name}</T>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Amount — Hero */}
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 16, paddingTop: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <T variant="mono" style={{ fontSize: 18, color: theme.muted, marginRight: 6 }}>
              {activeCurrency?.symbol ?? "$"}
            </T>
            <TextInput
              ref={amountRef}
              style={{ color: theme.ink, fontSize: 48, fontFamily: "IBMPlexMono", flex: 1, padding: 0 }}
              placeholder="0"
              placeholderTextColor={theme.placeholder}
              keyboardType="numeric"
              value={amount}
              onChangeText={handleAmountChange}
              onSelectionChange={(e) => {
                cursorPos.current = e.nativeEvent.selection.start;
              }}
            />
          </View>
        </View>

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
              style={chipStyle(effectiveCurrencyId === c.id)}
            >
              <T
                variant="label"
                style={{
                  color:
                    effectiveCurrencyId === c.id ? theme.background : theme.muted,
                  fontSize: 13,
                }}
              >
                {c.code}
              </T>
            </TouchableOpacity>
          ))}
        </View>

        {/* Title */}
        <T variant="label">Title</T>
        <TextInput
          style={[inputStyle, { marginTop: 8, marginBottom: 20 }]}
          placeholder="e.g. Weekly groceries"
          placeholderTextColor={theme.muted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Category */}
        <T variant="label">Category</T>
        {!categories || filteredCategories.length === 0 ? (
          <T variant="body" style={{ color: theme.muted, fontSize: 12, marginTop: 8, marginBottom: 20 }}>
            {!categories ? "Loading..." : "No categories for this type. Go to Settings to add one."}
          </T>
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8, marginBottom: 20 }}
        >
          <TouchableOpacity
            onPress={() => setCatSearchVisible(true)}
            style={{ borderWidth: 2, borderColor: theme.muted, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialCommunityIcons name="magnify" size={16} color={theme.ink} />
          </TouchableOpacity>
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
                    categoryId === c.id ? theme.background : theme.muted,
                  fontSize: 13,
                }}
              >
                {c.name}
              </T>
            </TouchableOpacity>
          ))}
        </ScrollView>
        )}

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
              style={{ color: theme.muted, fontSize: 12 }}
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
                    color: !accountId ? theme.background : theme.muted,
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
                          ? theme.background
                          : theme.muted,
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
            backgroundColor: theme.border,
            marginBottom: 20,
          }}
        />

        {/* Date */}
        <T variant="label">Date</T>
        <DateField value={date} onChange={setDate} style={{ marginTop: 8 }} />

        {/* Notes */}
        <T variant="label" style={{ marginTop: 16 }}>
          Notes
        </T>
        <TextInput
          style={[inputStyle, { minHeight: 60, marginTop: 8 }]}
          placeholder="What was this for?"
          placeholderTextColor={theme.muted}
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
                backgroundColor: theme.border,
                marginTop: 32,
                marginBottom: 16,
              }}
            />
            <TouchableOpacity
              onPress={handleDelete}
              style={{
                borderWidth: 2,
                borderColor: theme.expense,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <T
                variant="body"
                style={{
                  color: theme.expense,
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
      </KeyboardAvoidingView>

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

      {/* Category search modal */}
      <Modal transparent visible={catSearchVisible} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setCatSearchVisible(false)}>
        <View style={{ flex: 1, backgroundColor: theme.backdrop, padding: 24, paddingTop: 80 }}>
          <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 16, flex: 1 }}>
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <TextInput
                style={modalSearchStyle}
                placeholder="Search"
                placeholderTextColor={theme.placeholder}
                value={catSearchQuery}
                onChangeText={setCatSearchQuery}
                autoFocus
              />
              <TouchableOpacity onPress={() => setCatSearchVisible(false)} style={{ borderWidth: 2, borderColor: theme.muted, paddingHorizontal: 14, justifyContent: "center", marginLeft: 8 }}>
                <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>Close</T>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {filteredCategories.filter((c) => c.name.toLowerCase().includes(catSearchQuery.toLowerCase())).map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => { setCategoryId(c.id); setCatSearchVisible(false); setCatSearchQuery(""); }}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}
                >
                  <View style={{ width: 12, height: 12, backgroundColor: c.color ?? theme.muted, marginRight: 12 }} />
                  <T variant="body" style={{ fontSize: 16, color: categoryId === c.id ? theme.accent : theme.ink }}>{c.name}</T>
                  {categoryId === c.id && <T variant="label" style={{ color: theme.accent, marginLeft: 8 }}>✓</T>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

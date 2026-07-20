import { useState } from "react";
import { View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { usePresets, useAddPreset, useUpdatePreset, useArchivePreset } from "@/hooks/usePresets";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { T } from "@/components/ThemedText";
import { colors } from "@/theme/colors";
import type { PresetInsert } from "@/types/database";

export default function PresetForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.navigate("/(app)/presets");
  };
  const isEdit = !!id;

  const { data: presets } = usePresets();
  const { data: currencies } = useCurrencies();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const addMutation = useAddPreset();
  const updateMutation = useUpdatePreset();
  const archiveMutation = useArchivePreset();

  const existing = isEdit ? presets?.find((p) => p.id === id) : null;

  const [name, setName] = useState(existing?.name ?? "");
  const [type, setType] = useState<"income" | "expense">(existing?.type ?? "expense");
  const [defaultAmount, setDefaultAmount] = useState(existing?.default_amount != null ? String(existing.default_amount / 100) : "");
  const [currencyId, setCurrencyId] = useState(existing?.default_currency_id ?? currencies?.find((c) => c.is_default)?.id ?? "");
  const [categoryId, setCategoryId] = useState(existing?.default_category_id ?? "");
  const [accountId, setAccountId] = useState(existing?.default_account_id ?? "");
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories?.filter((c) => c.type === type) ?? [];

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert("Name required", "Give the preset a name."); return; }
    const amountCents = defaultAmount ? Math.round(parseFloat(defaultAmount) * 100) : null;
    const data: PresetInsert = { name: name.trim(), type, default_amount: amountCents, default_currency_id: currencyId || null, default_category_id: categoryId || null, default_account_id: accountId || null };
    setSaving(true);
    try {
      if (isEdit && id) await updateMutation.mutateAsync({ id, ...data });
      else await addMutation.mutateAsync(data);
      goBack();
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.background }}>
        <TouchableOpacity onPress={goBack}>
          <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>Cancel</T>
        </TouchableOpacity>
        <T variant="title">{isEdit ? "Edit Preset" : "New Preset"}</T>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.accent} /> : <T variant="body" style={{ color: colors.accent, fontSize: 14, textTransform: "uppercase" }}>Save</T>}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
        {/* Type toggle */}
        <View style={{ flexDirection: "row", marginBottom: 20, paddingTop: 8 }}>
          {(["expense", "income"] as const).map((t) => (
            <TouchableOpacity key={t} onPress={() => setType(t)} style={toggleBtn(t === type, t)}>
              <T variant="body" style={{ color: t === type ? colors.background : colors.muted, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>{t}</T>
            </TouchableOpacity>
          ))}
        </View>

        {/* Name */}
        <T variant="label" style={{ marginBottom: 6 }}>Name</T>
        <TextInput style={inputStyle} placeholder="e.g. Coffee, Netflix" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />

        {/* Default Amount */}
        <T variant="label" style={{ marginTop: 20, marginBottom: 6 }}>Default Amount (optional)</T>
        <TextInput style={inputStyle} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={defaultAmount} onChangeText={setDefaultAmount} />

        {/* Currency */}
        <T variant="label" style={{ marginTop: 20, marginBottom: 6 }}>Default Currency</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {currencies?.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setCurrencyId(c.id)} style={chip(currencyId === c.id)}>
              <T variant="label" style={{ color: currencyId === c.id ? colors.background : colors.muted, fontSize: 13 }}>{c.code}</T>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category */}
        <T variant="label" style={{ marginTop: 20, marginBottom: 6 }}>Default Category</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filteredCategories.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => setCategoryId(c.id)} style={[chip(categoryId === c.id), categoryId === c.id && c.color ? { borderColor: c.color, backgroundColor: c.color } : {}]}>
              <T variant="label" style={{ color: categoryId === c.id ? colors.background : colors.muted, fontSize: 13 }}>{c.name}</T>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Account */}
        <T variant="label" style={{ marginTop: 20, marginBottom: 6 }}>Default Account (optional)</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => setAccountId("")} style={chip(!accountId)}>
            <T variant="label" style={{ color: !accountId ? colors.background : colors.muted, fontSize: 13 }}>None</T>
          </TouchableOpacity>
          {accounts?.filter((a) => !a.archived).map((a) => (
            <TouchableOpacity key={a.id} onPress={() => setAccountId(a.id)} style={chip(accountId === a.id)}>
              <T variant="label" style={{ color: accountId === a.id ? colors.background : colors.muted, fontSize: 13 }}>{a.name}</T>
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider + Archive */}
        {isEdit && (
          <>
            <View style={{ height: 1, backgroundColor: "#1A1A1A", marginVertical: 16 }} />
            <TouchableOpacity
              style={{ borderWidth: 2, borderColor: colors.expense, paddingVertical: 12, alignItems: "center" }}
              onPress={() => {
                Alert.alert("Archive", "Archive this preset?", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Archive", style: "destructive", onPress: async () => { if (id) { await archiveMutation.mutateAsync(id); goBack(); } } },
                ]);
              }}
            >
              <T variant="body" style={{ color: colors.expense, textTransform: "uppercase", fontSize: 14 }}>Archive Preset</T>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function toggleBtn(active: boolean, t: string) {
  return {
    flex: 1,
    borderWidth: 2,
    borderColor: active ? (t === "income" ? colors.income : colors.expense) : colors.muted,
    backgroundColor: active ? (t === "income" ? colors.income : colors.expense) : "transparent",
    paddingVertical: 10,
    alignItems: "center" as const,
    marginRight: t === "expense" ? 4 : 0,
    marginLeft: t === "income" ? 4 : 0,
  };
}

const inputStyle = { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555555", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontFamily: "IBMPlexMono" };

function chip(active: boolean) {
  return { borderWidth: 2, borderColor: active ? colors.accent : colors.muted, backgroundColor: active ? colors.accent : "transparent", paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 };
}

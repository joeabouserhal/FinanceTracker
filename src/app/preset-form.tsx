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
import { usePresets, useAddPreset, useUpdatePreset, useArchivePreset } from "@/hooks/usePresets";
import { useCurrencies } from "@/hooks/useCurrencies";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { colors } from "@/theme/colors";
import { T } from "@/components/ThemedText";
import type { PresetInsert } from "@/types/database";

export default function PresetForm() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate("/(app)/presets");
    }
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
  const [defaultAmount, setDefaultAmount] = useState(
    existing?.default_amount != null ? String(existing.default_amount / 100) : ""
  );
  const [currencyId, setCurrencyId] = useState(
    existing?.default_currency_id ?? currencies?.find((c) => c.is_default)?.id ?? ""
  );
  const [categoryId, setCategoryId] = useState(existing?.default_category_id ?? "");
  const [accountId, setAccountId] = useState(existing?.default_account_id ?? "");
  const [saving, setSaving] = useState(false);

  const filteredCategories = categories?.filter((c) => c.type === type) ?? [];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give the preset a name.");
      return;
    }

    const amountCents = defaultAmount
      ? Math.round(parseFloat(defaultAmount) * 100)
      : null;

    const data: PresetInsert = {
      name: name.trim(),
      type,
      default_amount: amountCents,
      default_currency_id: currencyId || null,
      default_category_id: categoryId || null,
      default_account_id: accountId || null,
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
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingTop: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <TouchableOpacity onPress={goBack}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Cancel</Text>
        </TouchableOpacity>
        <T variant="title">
          {isEdit ? "Edit Preset" : "New Preset"}
        </T>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={{ color: colors.accent, fontSize: 14, textTransform: "uppercase" }}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Type toggle */}
      <View style={{ flexDirection: "row", marginBottom: 20 }}>
        {(["expense", "income"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setType(t)}
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
            <Text style={{ color: type === t ? colors.background : colors.muted, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Name</Text>
      <TextInput style={s.input} placeholder="e.g. Coffee, Netflix" placeholderTextColor={colors.muted} value={name} onChangeText={setName} />

      <Text style={[s.label, { marginTop: 16 }]}>Default Amount (optional)</Text>
      <TextInput style={s.input} placeholder="0.00" placeholderTextColor={colors.muted} keyboardType="decimal-pad" value={defaultAmount} onChangeText={setDefaultAmount} />

      <Text style={[s.label, { marginTop: 16 }]}>Default Currency</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {currencies?.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setCurrencyId(c.id)} style={chip(currencyId === c.id)}>
            <Text style={chipText(currencyId === c.id)}>{c.code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.label, { marginTop: 16 }]}>Default Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {filteredCategories.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setCategoryId(c.id)}
            style={[
              chip(categoryId === c.id),
              categoryId === c.id && c.color ? { borderColor: c.color, backgroundColor: c.color } : {},
            ]}
          >
            <Text style={chipText(categoryId === c.id)}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[s.label, { marginTop: 16 }]}>Default Account (optional)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <TouchableOpacity onPress={() => setAccountId("")} style={chip(!accountId)}>
          <Text style={chipText(!accountId)}>None</Text>
        </TouchableOpacity>
        {accounts?.filter((a) => !a.archived).map((a) => (
          <TouchableOpacity key={a.id} onPress={() => setAccountId(a.id)} style={chip(accountId === a.id)}>
            <Text style={chipText(accountId === a.id)}>{a.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isEdit && (
        <TouchableOpacity
          style={{ borderWidth: 2, borderColor: colors.expense, paddingVertical: 12, alignItems: "center", marginTop: 32 }}
          onPress={() => {
            Alert.alert("Archive", "Archive this preset?", [
              { text: "Cancel", style: "cancel" },
              { text: "Archive", style: "destructive", onPress: async () => { if (id) { await archiveMutation.mutateAsync(id); goBack(); } } },
            ]);
          }}
        >
          <Text style={{ color: colors.expense, textTransform: "uppercase", fontSize: 14 }}>Archive Preset</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const s = {
  label: { color: "#F5F1E8", fontSize: 12, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 1 },
  input: { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#77746C", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
};

function chip(active: boolean) {
  return { borderWidth: 2, borderColor: active ? colors.accent : colors.muted, backgroundColor: active ? colors.accent : "transparent", paddingHorizontal: 14, paddingVertical: 6 };
}

function chipText(active: boolean) {
  return { color: active ? colors.background : colors.muted, fontSize: 13, textTransform: "uppercase" as const };
}

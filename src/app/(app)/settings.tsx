import { useState } from "react";
import { View, TextInput, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useCurrencies, useAddCurrency, useDeleteCurrency, useSetDefaultCurrency } from "@/hooks/useCurrencies";
import { useCategories, useAddCategory, useArchiveCategory } from "@/hooks/useCategories";
import { T } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/theme/colors";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { data: currencies } = useCurrencies();
  const { data: categories } = useCategories();
  const addCurrency = useAddCurrency();
  const deleteCurrency = useDeleteCurrency();
  const setDefault = useSetDefaultCurrency();
  const addCategory = useAddCategory();
  const archiveCategory = useArchiveCategory();

  const [newCode, setNewCode] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");

  const handleAddCurrency = async () => {
    if (!newCode.trim() || !newSymbol.trim() || !newName.trim()) { Alert.alert("All fields required"); return; }
    try { await addCurrency.mutateAsync({ code: newCode.trim().toUpperCase(), symbol: newSymbol.trim(), name: newName.trim(), is_default: currencies?.length === 0 }); setNewCode(""); setNewSymbol(""); setNewName(""); }
    catch (e: any) { Alert.alert("Error", e.message); }
  };
  const handleAddCategory = async () => {
    if (!catName.trim()) { Alert.alert("Name required"); return; }
    try { await addCategory.mutateAsync({ name: catName.trim(), type: catType, icon: null, color: catType === "income" ? "#4C9A63" : "#E8432E" }); setCatName(""); }
    catch (e: any) { Alert.alert("Error", e.message); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 8, backgroundColor: colors.background }}>
        <T variant="title">Settings</T>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottomWidth: 1, borderBottomColor: "#1A1A1A", paddingBottom: 16 }}>
          <T variant="body" style={{ fontSize: 14, color: colors.muted }}>{user?.email}</T>
          <TouchableOpacity onPress={signOut}><T variant="body" style={{ color: colors.expense, fontSize: 13, textTransform: "uppercase" }}>Sign Out</T></TouchableOpacity>
        </View>

        <T variant="label" style={sectionStyle}>Currencies</T>
        {currencies?.map((c) => (
          <View key={c.id} style={rowStyle}>
            <T variant="body" style={{ fontSize: 14 }}>{c.name} ({c.code}){c.is_default ? " · Default" : ""}</T>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {!c.is_default && <TouchableOpacity onPress={() => setDefault.mutate(c.id)}><T variant="body" style={{ color: colors.accent, fontSize: 12 }}>Set Default</T></TouchableOpacity>}
              <TouchableOpacity onPress={() => { Alert.alert("Remove", `Remove ${c.code}?`, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => deleteCurrency.mutate(c.id) }]); }}><T variant="body" style={{ color: colors.expense, fontSize: 12 }}>Remove</T></TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
          <TextInput style={inputStyle} placeholder="USD" placeholderTextColor={colors.muted} value={newCode} onChangeText={setNewCode} />
          <TextInput style={inputStyle} placeholder="$" placeholderTextColor={colors.muted} value={newSymbol} onChangeText={setNewSymbol} />
          <TextInput style={[inputStyle, { flex: 2 }]} placeholder="Name" placeholderTextColor={colors.muted} value={newName} onChangeText={setNewName} />
          <TouchableOpacity onPress={handleAddCurrency} style={{ borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingHorizontal: 12, justifyContent: "center" }}><T variant="label" style={{ color: colors.background, fontSize: 12 }}>Add</T></TouchableOpacity>
        </View>

        <T variant="label" style={[sectionStyle, { marginTop: 32 }]}>Categories</T>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <TextInput style={[inputStyle, { flex: 1 }]} placeholder="Category name" placeholderTextColor={colors.muted} value={catName} onChangeText={setCatName} />
          <TouchableOpacity onPress={() => setCatType(catType === "expense" ? "income" : "expense")} style={{ borderWidth: 2, borderColor: catType === "income" ? colors.income : colors.expense, backgroundColor: catType === "income" ? colors.income : colors.expense, paddingHorizontal: 12, justifyContent: "center" }}><T variant="label" style={{ color: colors.background, fontSize: 12 }}>{catType}</T></TouchableOpacity>
          <TouchableOpacity onPress={handleAddCategory} style={{ borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingHorizontal: 12, justifyContent: "center" }}><T variant="label" style={{ color: colors.background, fontSize: 12 }}>Add</T></TouchableOpacity>
        </View>
        {categories?.map((c) => (
          <View key={c.id} style={rowStyle}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, backgroundColor: c.color ?? colors.muted }} />
              <T variant="body" style={{ fontSize: 14 }}>{c.name}</T>
              <T variant="label" style={{ fontSize: 10 }}>{c.type}</T>
            </View>
            {!c.is_default && <TouchableOpacity onPress={() => { Alert.alert("Archive", `Archive ${c.name}?`, [{ text: "Cancel", style: "cancel" }, { text: "Archive", style: "destructive", onPress: () => archiveCategory.mutate(c.id) }]); }}><T variant="body" style={{ color: colors.expense, fontSize: 12 }}>Archive</T></TouchableOpacity>}
          </View>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const sectionStyle = { borderBottomWidth: 2, borderBottomColor: "#F4C430", paddingBottom: 8, marginBottom: 12 };
const rowStyle = { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#77746C", borderStyle: "dashed" } as const;
const inputStyle = { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#77746C", color: "#F5F1E8", paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "IBMPlexSans" };

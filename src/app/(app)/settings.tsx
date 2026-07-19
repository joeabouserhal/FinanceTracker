import { useState, useEffect } from "react";
import { View, TextInput, ScrollView, TouchableOpacity, Alert, Modal } from "react-native";
import { useCurrencies, useAddCurrency, useDeleteCurrency, useSetDefaultCurrency } from "@/hooks/useCurrencies";
import { useCategories, useAddCategory, useArchiveCategory, useUpdateCategory } from "@/hooks/useCategories";
import { T } from "@/components/ThemedText";
import { BrutalistToggle, getBiometricEnabled, setBiometricEnabled } from "@/components/BrutalistToggle";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/theme/colors";

const PRESET_COLORS = ["#4C9A63", "#E8432E", "#F4C430", "#77746C", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];
const S = 16; // base spacing unit

export default function Settings() {
  const { user, signOut } = useAuth();
  const { data: currencies } = useCurrencies();
  const { data: categories } = useCategories();
  const addCurrency = useAddCurrency();
  const deleteCurrency = useDeleteCurrency();
  const setDefault = useSetDefaultCurrency();
  const addCategory = useAddCategory();
  const archiveCategory = useArchiveCategory();
  const updateCategory = useUpdateCategory();

  const [newCode, setNewCode] = useState("");
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");

  const [addModal, setAddModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const [biometricOn, setBiometricOn] = useState(true);

  useEffect(() => { getBiometricEnabled().then(setBiometricOn); }, []);

  const toggleBiometric = () => {
    const next = !biometricOn;
    setBiometricOn(next);
    setBiometricEnabled(next);
  };

  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleAddCurrency = async () => {
    if (!newCode.trim() || !newSymbol.trim() || !newName.trim()) { Alert.alert("All fields required"); return; }
    try { await addCurrency.mutateAsync({ code: newCode.trim().toUpperCase(), symbol: newSymbol.trim(), name: newName.trim(), is_default: currencies?.length === 0 }); setNewCode(""); setNewSymbol(""); setNewName(""); }
    catch (e: any) { Alert.alert("Error", e.message); }
  };

  const openAddCategory = () => { setCatName(""); setCatType("expense"); setCatColor(PRESET_COLORS[0]); setAddModal(true); };
  const handleAddCategory = async () => { if (!catName.trim()) return; try { await addCategory.mutateAsync({ name: catName.trim(), type: catType, icon: null, color: catColor }); setAddModal(false); } catch (e: any) { Alert.alert("Error", e.message); } };
  const openEditCategory = (id: string, name: string, color: string | null) => { setEditId(id); setEditName(name); setEditColor(color ?? PRESET_COLORS[0]); setEditModal(true); };
  const handleUpdateCategory = async () => { try { await updateCategory.mutateAsync({ id: editId, color: editColor }); setEditModal(false); } catch (e: any) { Alert.alert("Error", e.message); } };

  const modalStyle = { flex: 1, justifyContent: "center" as const, alignItems: "center" as const, backgroundColor: "rgba(0,0,0,0.7)", padding: 24 };
  const cardStyle = { backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 24, width: "100%" as const, maxWidth: 320 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: S, paddingTop: 48, paddingBottom: S / 2, backgroundColor: colors.background }}>
        <T variant="title">Settings</T>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: S }}>
        {/* Email + Sign Out */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: "#1A1A1A", paddingVertical: S }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <T variant="body" style={{ fontSize: 14, color: colors.muted }}>{user?.email}</T>
            <TouchableOpacity onPress={signOut} style={{ borderWidth: 2, borderColor: colors.expense, paddingVertical: S / 4, paddingHorizontal: S / 2 }}>
              <T variant="body" style={{ color: colors.expense, fontSize: 12, textTransform: "uppercase" }}>Sign Out</T>
            </TouchableOpacity>
          </View>
        </View>

        {/* Biometric Lock */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: "#1A1A1A", paddingVertical: S }}>
          <BrutalistToggle value={biometricOn} onToggle={toggleBiometric} label="Biometric lock" />
        </View>

        {/* Currencies Section Header */}
        <T variant="label" style={{ borderBottomWidth: 2, borderBottomColor: "#F4C430", paddingVertical: S / 2, marginBottom: S }}>Currencies</T>

        {currencies?.map((c) => (
          <View key={c.id} style={{ paddingVertical: S / 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <T variant="body" style={{ fontSize: 14 }}>{c.name} ({c.code}){c.is_default ? " · Default" : ""}</T>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {!c.is_default && <TouchableOpacity onPress={() => setDefault.mutate(c.id)}><T variant="body" style={{ color: colors.accent, fontSize: 12 }}>Set Default</T></TouchableOpacity>}
                <TouchableOpacity onPress={() => { Alert.alert("Remove", `Remove ${c.code}?`, [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => deleteCurrency.mutate(c.id) }]); }}>
                  <T variant="body" style={{ color: colors.expense, fontSize: 12 }}>Remove</T>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <View style={{ flexDirection: "row", gap: 8, marginTop: S / 2 }}>
          <TextInput style={inputStyle} placeholder="USD" placeholderTextColor={colors.muted} value={newCode} onChangeText={setNewCode} />
          <TextInput style={inputStyle} placeholder="$" placeholderTextColor={colors.muted} value={newSymbol} onChangeText={setNewSymbol} />
          <TextInput style={[inputStyle, { flex: 2 }]} placeholder="Name" placeholderTextColor={colors.muted} value={newName} onChangeText={setNewName} />
          <TouchableOpacity onPress={handleAddCurrency} style={{ borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingHorizontal: S, justifyContent: "center" }}>
            <T variant="label" style={{ color: colors.background, fontSize: 12 }}>Add</T>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: "#1A1A1A", paddingVertical: S }} />

        {/* Categories Section Header */}
        <T variant="label" style={{ borderBottomWidth: 2, borderBottomColor: "#F4C430", paddingVertical: S / 2, marginBottom: S }}>Categories</T>

        <TouchableOpacity onPress={openAddCategory} style={{ borderWidth: 2, borderColor: colors.accent, paddingVertical: S / 2, alignItems: "center", marginBottom: S }}>
          <T variant="body" style={{ color: colors.accent, fontSize: 14, textTransform: "uppercase" }}>+ Add Category</T>
        </TouchableOpacity>

        {categories?.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => openEditCategory(c.id, c.name, c.color)} style={{ paddingVertical: S / 2 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 10, height: 10, backgroundColor: c.color ?? colors.muted }} />
                <T variant="body" style={{ fontSize: 14 }}>{c.name}</T>
                <T variant="label" style={{ fontSize: 10 }}>{c.type}</T>
              </View>
              {!c.is_default && (
                <TouchableOpacity onPress={() => { Alert.alert("Archive", `Archive ${c.name}?`, [{ text: "Cancel", style: "cancel" }, { text: "Archive", style: "destructive", onPress: () => archiveCategory.mutate(c.id) }]); }}>
                  <T variant="body" style={{ color: colors.expense, fontSize: 12 }}>Archive</T>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 64 }} />
      </ScrollView>

      {/* Add Category Modal */}
      <Modal transparent visible={addModal} animationType="fade" onRequestClose={() => setAddModal(false)}>
        <View style={modalStyle}>
          <View style={cardStyle}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 20 }}>Add Category</T>
            <T variant="label">Name</T>
            <TextInput style={inputStyle} placeholder="Category name" placeholderTextColor={colors.muted} value={catName} onChangeText={setCatName} />
            <T variant="label" style={{ marginTop: S }}>Type</T>
            <View style={{ flexDirection: "row", gap: 8, marginTop: S / 2 }}>
              {(["expense", "income"] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setCatType(t)} style={{ flex: 1, borderWidth: 2, borderColor: catType === t ? (t === "income" ? colors.income : colors.expense) : colors.muted, backgroundColor: catType === t ? (t === "income" ? colors.income : colors.expense) : "transparent", paddingVertical: S / 2, alignItems: "center" }}>
                  <T variant="label" style={{ color: catType === t ? colors.background : colors.muted, fontSize: 12 }}>{t}</T>
                </TouchableOpacity>
              ))}
            </View>
            <T variant="label" style={{ marginTop: S }}>Color</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: S / 2 }}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setCatColor(color)} style={{ width: 32, height: 32, backgroundColor: color, borderWidth: 2, borderColor: catColor === color ? colors.ink : "transparent" }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setAddModal(false)} style={{ flex: 1, borderWidth: 2, borderColor: colors.muted, paddingVertical: S / 2, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} style={{ flex: 1, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingVertical: S / 2, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Add</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal transparent visible={editModal} animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={modalStyle}>
          <View style={cardStyle}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: S / 2 }}>{editName}</T>
            <T variant="label" style={{ marginTop: S }}>Color</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: S / 2 }}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setEditColor(color)} style={{ width: 32, height: 32, backgroundColor: color, borderWidth: 2, borderColor: editColor === color ? colors.ink : "transparent" }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={{ flex: 1, borderWidth: 2, borderColor: colors.muted, paddingVertical: S / 2, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateCategory} style={{ flex: 1, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingVertical: S / 2, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Save</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const inputStyle = { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#77746C", color: "#F5F1E8", paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "IBMPlexSans" };

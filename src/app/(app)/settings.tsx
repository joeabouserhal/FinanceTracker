import { BrutalistToggle, getBiometricEnabled, setBiometricEnabled } from "@/components/BrutalistToggle";
import { T } from "@/components/ThemedText";
import { useAuth } from "@/hooks/useAuth";
import { useAddCategory, useArchiveCategory, useCategories, useUpdateCategory } from "@/hooks/useCategories";
import { useAddCurrency, useCurrencies, useDeleteCurrency, useSetDefaultCurrency } from "@/hooks/useCurrencies";
import { colors } from "@/theme/colors";
import { useEffect, useState } from "react";
import { Modal, ScrollView, TextInput, TouchableOpacity, View } from "react-native";

const PRESET_COLORS = ["#4C9A63", "#E8432E", "#F4C430", "#77746C", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];
const S = 16;

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
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => { getBiometricEnabled().then(setBiometricOn); }, []);

  const toggleBiometric = () => { const next = !biometricOn; setBiometricOn(next); setBiometricEnabled(next); };

  // Category modals
  const [addModal, setAddModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const openAddCategory = () => { setCatName(""); setCatType("expense"); setCatColor(PRESET_COLORS[0]); setAddModal(true); };
  const handleAddCategory = async () => { if (!catName.trim()) return; try { await addCategory.mutateAsync({ name: catName.trim(), type: catType, icon: null, color: catColor }); setAddModal(false); } catch {} };

  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const openEditCategory = (id: string, name: string, color: string | null) => { setEditId(id); setEditName(name); setEditColor(color ?? PRESET_COLORS[0]); setEditModal(true); };
  const handleUpdateCategory = async () => { try { await updateCategory.mutateAsync({ id: editId, color: editColor }); setEditModal(false); } catch {} };

  // Confirm modal
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
  const showConfirm = (title: string, message: string, action: () => void) => { setConfirmTitle(title); setConfirmMessage(message); setConfirmAction(() => action); setConfirmVisible(true); };

  const handleAddCurrency = async () => {
    if (!newCode.trim() || !newSymbol.trim() || !newName.trim()) return;
    try { await addCurrency.mutateAsync({ code: newCode.trim().toUpperCase(), symbol: newSymbol.trim(), name: newName.trim(), is_default: currencies?.length === 0 }); setNewCode(""); setNewSymbol(""); setNewName(""); } catch {}
  };

  const modalBg = { flex: 1, justifyContent: "center" as const, alignItems: "center" as const, backgroundColor: "rgba(0,0,0,0.7)", padding: 24 };
  const row = { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const };
  const secHead = { marginBottom: S, marginTop: S * 1.5 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: S, paddingTop: 48, paddingBottom: S }}>
        <T variant="title">Settings</T>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: S, paddingBottom: 80 }}>

        {/* ── Account ── */}
        <View style={row}>
          <T variant="body" style={{ fontSize: 14, color: colors.muted }}>{user?.email}</T>
          <TouchableOpacity onPress={signOut} style={{ borderWidth: 2, borderColor: colors.expense, paddingVertical: 6, paddingHorizontal: S }}>
            <T variant="label" style={{ color: colors.expense, fontSize: 11 }}>SIGN OUT</T>
          </TouchableOpacity>
        </View>

        {/* ── Biometric ── */}
        <View style={secHead}>
          <T variant="label" style={{ marginBottom: 8 }}>Security</T>
          <BrutalistToggle value={biometricOn} onToggle={toggleBiometric} label="Require biometrics on launch" />
        </View>

        {/* ── Currencies ── */}
        <View style={secHead}>
          <T variant="label" style={{ marginBottom: 8 }}>Currencies</T>
          {currencies?.map((c) => (
            <View key={c.id} style={[row, { paddingVertical: S / 2 }]}>
              <View>
                <T variant="body" style={{ fontSize: 14 }}>{c.code} — {c.symbol}</T>
                <T variant="body" style={{ fontSize: 12, color: colors.muted }}>{c.name}{c.is_default ? "  ·  Default" : ""}</T>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {!c.is_default && <TouchableOpacity onPress={() => setDefault.mutate(c.id)}><T variant="body" style={{ color: colors.accent, fontSize: 12 }}>Set default</T></TouchableOpacity>}
                <TouchableOpacity onPress={() => showConfirm("Remove currency", `Remove ${c.code}?`, () => deleteCurrency.mutate(c.id))}><T variant="body" style={{ color: colors.expense, fontSize: 12 }}>Remove</T></TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" }}>
            <TextInput style={compactInput} placeholder="USD" placeholderTextColor={colors.muted} value={newCode} onChangeText={setNewCode} />
            <TextInput style={compactInput} placeholder="$" placeholderTextColor={colors.muted} value={newSymbol} onChangeText={setNewSymbol} />
            <TextInput style={[compactInput, { flex: 2 }]} placeholder="Name" placeholderTextColor={colors.muted} value={newName} onChangeText={setNewName} />
            <TouchableOpacity onPress={handleAddCurrency} style={{ borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 8 }}>
              <T variant="label" style={{ color: colors.background, fontSize: 12 }}>Add</T>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Categories ── */}
        <View style={secHead}>
          <T variant="label" style={{ marginBottom: 8 }}>Categories</T>
          {categories?.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => openEditCategory(c.id, c.name, c.color)} style={[row, { paddingVertical: S / 2 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 12, height: 12, backgroundColor: c.color ?? colors.muted }} />
                <T variant="body" style={{ fontSize: 14 }}>{c.name}</T>
                <T variant="label" style={{ fontSize: 10, color: c.type === "income" ? colors.income : colors.expense }}>{c.type}</T>
              </View>
              {!c.is_default && (
                <TouchableOpacity onPress={() => showConfirm("Archive category", `Archive ${c.name}?`, () => archiveCategory.mutate(c.id))}>
                  <T variant="body" style={{ color: colors.expense, fontSize: 12 }}>Archive</T>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={openAddCategory} style={{ borderWidth: 2, borderColor: colors.accent, paddingVertical: 10, alignItems: "center", marginTop: 12 }}>
            <T variant="label" style={{ color: colors.accent, fontSize: 12 }}>+ ADD CATEGORY</T>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Add Category Modal ── */}
      <Modal transparent visible={addModal} animationType="fade" onRequestClose={() => setAddModal(false)}>
        <View style={modalBg}>
          <View style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 24, width: "100%", maxWidth: 320 }}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 20 }}>Add Category</T>
            <T variant="label">Name</T>
            <TextInput style={inputStyle} placeholder="Category name" placeholderTextColor={colors.muted} value={catName} onChangeText={setCatName} />
            <T variant="label" style={{ marginTop: S }}>Type</T>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {(["expense", "income"] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setCatType(t)} style={{ flex: 1, borderWidth: 2, borderColor: catType === t ? (t === "income" ? colors.income : colors.expense) : colors.muted, backgroundColor: catType === t ? (t === "income" ? colors.income : colors.expense) : "transparent", paddingVertical: 8, alignItems: "center" }}>
                  <T variant="label" style={{ color: catType === t ? colors.background : colors.muted, fontSize: 12 }}>{t}</T>
                </TouchableOpacity>
              ))}
            </View>
            <T variant="label" style={{ marginTop: S }}>Color</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setCatColor(color)} style={{ width: 32, height: 32, backgroundColor: color, borderWidth: 2, borderColor: catColor === color ? colors.ink : "transparent" }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setAddModal(false)} style={{ flex: 1, borderWidth: 2, borderColor: colors.muted, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} style={{ flex: 1, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Add</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Category Modal ── */}
      <Modal transparent visible={editModal} animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={modalBg}>
          <View style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 24, width: "100%", maxWidth: 320 }}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 8 }}>{editName}</T>
            <T variant="label" style={{ marginTop: S }}>Color</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setEditColor(color)} style={{ width: 32, height: 32, backgroundColor: color, borderWidth: 2, borderColor: editColor === color ? colors.ink : "transparent" }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={{ flex: 1, borderWidth: 2, borderColor: colors.muted, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateCategory} style={{ flex: 1, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accent, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Save</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Confirm Modal ── */}
      <Modal transparent visible={confirmVisible} animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={modalBg}>
          <View style={{ backgroundColor: colors.background, borderWidth: 2, borderColor: "#1A1A1A", padding: 24, width: "100%", maxWidth: 320 }}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 8 }}>{confirmTitle}</T>
            <T variant="body" style={{ color: colors.muted, fontSize: 14, marginBottom: 20 }}>{confirmMessage}</T>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => setConfirmVisible(false)} style={{ flex: 1, borderWidth: 2, borderColor: colors.muted, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setConfirmVisible(false); confirmAction(); }} style={{ flex: 1, borderWidth: 2, borderColor: colors.expense, backgroundColor: colors.expense, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: colors.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Confirm</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const inputStyle = { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555555", color: "#F5F1E8", paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, fontFamily: "IBMPlexMono" };
const compactInput = { backgroundColor: "#0A0A0A", borderWidth: 2, borderColor: "#555555", color: "#F5F1E8", paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: "IBMPlexMono" };

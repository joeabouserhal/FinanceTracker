import { BrutalistToggle } from "@/components/BrutalistToggle";
import { T } from "@/components/ThemedText";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ThemedConfirm } from "@/components/ThemedAlert";
import { ThemePickerModal } from "@/components/ThemePickerModal";
import { useAuth } from "@/hooks/useAuth";
import { useBiometricStore } from "@/lib/biometric-store";
import { useAddCategory, useArchiveCategory, useCategories, useUpdateCategory } from "@/hooks/useCategories";
import { useAddCurrency, useCurrencies, useDeleteCurrency, useSetDefaultCurrency } from "@/hooks/useCurrencies";
import { useTheme } from "@/theme/store";
import { useInputStyle } from "@/theme/styles";
import { getErrorMessage } from "@/utils/errors";
import { useState } from "react";
import { Modal, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

const PRESET_COLORS = ["#4C9A63", "#E8432E", "#F4C430", "#77746C", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6"];
const S = 16;

export default function Settings() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const inputStyle = useInputStyle();
  const compactInput = useInputStyle(true);
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
  const biometricOn = useBiometricStore((s) => s.enabled);
  const setBiometricOn = useBiometricStore((s) => s.setEnabled);
  const [themeVisible, setThemeVisible] = useState(false);

  const toggleBiometric = () => setBiometricOn(!biometricOn);
  const handleSignOut = async () => { await signOut(); router.replace("/"); };
  // Category modals
  const [addModal, setAddModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"expense" | "income">("expense");
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);
  const [catSaving, setCatSaving] = useState(false);

  const openAddCategory = () => { setCatName(""); setCatType("expense"); setCatColor(PRESET_COLORS[0]); setAddModal(true); };
  const handleAddCategory = async () => {
    if (!catName.trim() || catSaving) return;
    setCatSaving(true);
    try { await addCategory.mutateAsync({ name: catName.trim(), type: catType, icon: null, color: catColor }); setAddModal(false); }
    catch (e) { showConfirm("Error", getErrorMessage(e), () => {}); }
    finally { setCatSaving(false); }
  };
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

  const modalBg = { flex: 1, justifyContent: "center" as const, alignItems: "center" as const, backgroundColor: theme.backdrop, padding: 24 };
  const row = { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const };
  // Uniform section rhythm: 16 above each section, label 8 above its content,
  // list rows 8 tall, trailing actions 16 after the list. Sections are
  // separated by a 1px border (home-screen style) — all but the last get it.
  const section = { marginTop: S } as const;
  const sectionDivided = { marginTop: S, paddingBottom: S, borderBottomWidth: 1, borderBottomColor: theme.border } as const;
  const sectionLabel = { marginBottom: 8 } as const;
  const rowPad = { paddingVertical: S / 2 } as const;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScreenHeader title="Settings" />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: S, paddingBottom: 80 }}>

        {/* ── Account ── */}
        <View style={sectionDivided}>
          <T variant="label" style={sectionLabel}>Account</T>
          <View style={[row, rowPad]}>
            <T variant="body" style={{ fontSize: 14, color: theme.muted }}>{user?.email}</T>
            <TouchableOpacity onPress={() => showConfirm("Sign out", "Sign out of Finance Tracker?", handleSignOut)} style={{ borderWidth: 2, borderColor: theme.expense, paddingVertical: 6, paddingHorizontal: S }}>
              <T variant="label" style={{ color: theme.expense, fontSize: 11 }}>SIGN OUT</T>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Appearance ── */}
        <View style={sectionDivided}>
          <T variant="label" style={sectionLabel}>Appearance</T>
          <TouchableOpacity onPress={() => setThemeVisible(true)} style={[row, rowPad]}>
            <T variant="body" style={{ fontSize: 14 }}>Theme</T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <T variant="body" style={{ fontSize: 14, color: theme.muted }}>{theme.name}</T>
              <T variant="body" style={{ color: theme.muted, fontSize: 16 }}>›</T>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Security ── */}
        <View style={sectionDivided}>
          <T variant="label" style={sectionLabel}>Security</T>
          <View style={rowPad}>
            <BrutalistToggle value={biometricOn} onToggle={toggleBiometric} label="Biometric lock" />
          </View>
        </View>

        {/* ── Currencies ── */}
        <View style={sectionDivided}>
          <T variant="label" style={sectionLabel}>Currencies</T>
          {currencies?.map((c) => (
            <View key={c.id} style={[row, rowPad]}>
              <View>
                <T variant="body" style={{ fontSize: 14 }}>{c.code} — {c.symbol}</T>
                <T variant="body" style={{ fontSize: 12, color: theme.muted }}>{c.name}{c.is_default ? "  ·  Default" : ""}</T>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {!c.is_default && <TouchableOpacity onPress={() => setDefault.mutate(c.id)}><T variant="body" style={{ color: theme.accent, fontSize: 12 }}>Set default</T></TouchableOpacity>}
                <TouchableOpacity onPress={() => showConfirm("Remove currency", `Remove ${c.code}?`, () => deleteCurrency.mutate(c.id))}><T variant="body" style={{ color: theme.expense, fontSize: 12 }}>Remove</T></TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 8, marginTop: S, alignItems: "center" }}>
            <TextInput style={compactInput} placeholder="USD" placeholderTextColor={theme.muted} value={newCode} onChangeText={setNewCode} />
            <TextInput style={compactInput} placeholder="$" placeholderTextColor={theme.muted} value={newSymbol} onChangeText={setNewSymbol} />
            <TextInput style={[compactInput, { flex: 2 }]} placeholder="Name" placeholderTextColor={theme.muted} value={newName} onChangeText={setNewName} />
            <TouchableOpacity onPress={handleAddCurrency} style={{ borderWidth: 2, borderColor: theme.accent, backgroundColor: theme.accent, paddingHorizontal: 14, paddingVertical: 8 }}>
              <T variant="label" style={{ color: theme.background, fontSize: 12 }}>Add</T>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Categories ── */}
        <View style={section}>
          <T variant="label" style={sectionLabel}>Categories</T>
          {categories?.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => openEditCategory(c.id, c.name, c.color)} style={[row, rowPad]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 12, height: 12, backgroundColor: c.color ?? theme.muted }} />
                <T variant="body" style={{ fontSize: 14 }}>{c.name}</T>
                <T variant="label" style={{ fontSize: 10, color: c.type === "income" ? theme.income : theme.expense }}>{c.type}</T>
              </View>
              {!c.is_default && (
                <TouchableOpacity onPress={() => showConfirm("Archive category", `Archive ${c.name}?`, () => archiveCategory.mutate(c.id))}>
                  <T variant="body" style={{ color: theme.expense, fontSize: 12 }}>Archive</T>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={openAddCategory} style={{ borderWidth: 2, borderColor: theme.accent, paddingVertical: 10, alignItems: "center", marginTop: S }}>
            <T variant="label" style={{ color: theme.accent, fontSize: 12 }}>+ ADD CATEGORY</T>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Add Category Modal ── */}
      <Modal transparent visible={addModal} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setAddModal(false)}>
        <View style={modalBg}>
          <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 320 }}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 20 }}>Add Category</T>
            <T variant="label">Name</T>
            <TextInput style={inputStyle} placeholder="Category name" placeholderTextColor={theme.muted} value={catName} onChangeText={setCatName} />
            <T variant="label" style={{ marginTop: S }}>Type</T>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {(["expense", "income"] as const).map((t) => (
                <TouchableOpacity key={t} onPress={() => setCatType(t)} style={{ flex: 1, borderWidth: 2, borderColor: catType === t ? (t === "income" ? theme.income : theme.expense) : theme.muted, backgroundColor: catType === t ? (t === "income" ? theme.income : theme.expense) : "transparent", paddingVertical: 8, alignItems: "center" }}>
                  <T variant="label" style={{ color: catType === t ? theme.background : theme.muted, fontSize: 12 }}>{t}</T>
                </TouchableOpacity>
              ))}
            </View>
            <T variant="label" style={{ marginTop: S }}>Color</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setCatColor(color)} style={{ width: 32, height: 32, backgroundColor: color, borderWidth: 2, borderColor: catColor === color ? theme.ink : "transparent" }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setAddModal(false)} style={{ flex: 1, borderWidth: 2, borderColor: theme.muted, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} disabled={catSaving} style={{ flex: 1, borderWidth: 2, borderColor: theme.accent, backgroundColor: catSaving ? "transparent" : theme.accent, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: catSaving ? theme.accent : theme.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>{catSaving ? "..." : "Add"}</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Edit Category Modal ── */}
      <Modal transparent visible={editModal} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setEditModal(false)}>
        <View style={modalBg}>
          <View style={{ backgroundColor: theme.background, borderWidth: 2, borderColor: theme.border, padding: 24, width: "100%", maxWidth: 320 }}>
            <T variant="heading" style={{ fontSize: 18, marginBottom: 8 }}>{editName}</T>
            <T variant="label" style={{ marginTop: S }}>Color</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity key={color} onPress={() => setEditColor(color)} style={{ width: 32, height: 32, backgroundColor: color, borderWidth: 2, borderColor: editColor === color ? theme.ink : "transparent" }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={{ flex: 1, borderWidth: 2, borderColor: theme.muted, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: theme.muted, fontSize: 14, textTransform: "uppercase" }}>Cancel</T>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateCategory} style={{ flex: 1, borderWidth: 2, borderColor: theme.accent, backgroundColor: theme.accent, paddingVertical: 10, alignItems: "center" }}>
                <T variant="body" style={{ color: theme.background, fontSize: 14, textTransform: "uppercase", fontWeight: "700" }}>Save</T>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Confirm (shared) ── */}
      <ThemedConfirm
        visible={confirmVisible}
        title={confirmTitle}
        message={confirmMessage}
        destructive
        onCancel={() => setConfirmVisible(false)}
        onConfirm={() => { setConfirmVisible(false); confirmAction(); }}
      />

      {/* ── Theme picker ── */}
      <ThemePickerModal visible={themeVisible} onClose={() => setThemeVisible(false)} />
    </View>
  );
}

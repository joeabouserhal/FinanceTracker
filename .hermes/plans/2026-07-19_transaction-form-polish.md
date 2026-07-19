# Transaction Form Polish — Implementation Plan

> **For Hermes:** Implement task-by-task. Each task is self-contained.

**Goal:** Polish the add/edit transaction screen to be more visually appealing, intuitive, and consistent with the brutalist dark theme.

**Architecture:** Restructure the form into clearly grouped sections with a sticky header, make the amount field the hero of the screen, convert chip selectors into a unified visual language, and apply themed fonts everywhere.

**Tech Stack:** React Native, `T` themed text component, expo-router

---

### Task 1: Replace all raw `<Text>` with `<T>` themed component

**Objective:** Every visible text label uses the brutalist font system.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** Import `T` from `@/components/ThemedText`

Add at top with other imports:
```typescript
import { T } from "@/components/ThemedText";
```

**Step 2:** Replace all `<Text style={...}>...</Text>` instances with `<T variant="..." style={...}>...</T>`

| Current | Replace with |
|---|---|
| `<Text style={{ color: colors.muted, fontSize: 14 }}>Cancel</Text>` | `<T variant="body" style={{ color: colors.muted, fontSize: 14 }}>Cancel</T>` |
| `<Text style={{ color: colors.ink, fontFamily: "ArchivoBlack", fontSize: 18 }}>` | `<T variant="heading" style={{ fontSize: 18 }}>` |
| `<Text style={{ color: colors.accent, fontSize: 14, textTransform: "uppercase" }}>Save</Text>` | `<T variant="body" style={{ color: colors.accent, fontSize: 14, textTransform: "uppercase" }}>Save</T>` |
| All preset chip labels | `<T variant="label" style={{ color: colors.muted, fontSize: 12 }}>` |
| Type toggle labels | `<T variant="body" style={{...}}>` |
| Section labels (Amount, Currency, etc.) | `<T variant="label">` |
| Delete button text | `<T variant="body" style={{ color: colors.expense, textTransform: "uppercase", fontSize: 14 }}>` |

**Step 3:** Remove the `s.label` style object at the bottom — it's superseded by `T variant="label"`.

**Verification:** `npx tsc --noEmit` — no errors. Visual check: all text uses brutalist fonts.

---

### Task 2: Make the header sticky (Cancel / title / Save)

**Objective:** Cancel and Save buttons stay visible while scrolling.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** Wrap the entire screen in a `<View style={{ flex: 1, backgroundColor: colors.background }}>`.

**Step 2:** Pull the header `<View>` out of the ScrollView into a fixed View above it:
```tsx
return (
  <View style={{ flex: 1, backgroundColor: colors.background }}>
    {/* Sticky Header */}
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, backgroundColor: colors.background }}>
      <TouchableOpacity onPress={() => router.back()}>
        <T variant="body" style={{ color: colors.muted, fontSize: 14 }}>Cancel</T>
      </TouchableOpacity>
      <T variant="heading" style={{ fontSize: 18 }}>
        {isEdit ? "Edit" : "New"} Transaction
      </T>
      <TouchableOpacity onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.accent} /> : <T variant="body" style={{ color: colors.accent, fontSize: 14, textTransform: "uppercase" }}>Save</T>}
      </TouchableOpacity>
    </View>

    <ScrollView ...>
      {/* rest of form */}
    </ScrollView>
  </View>
);
```

**Step 3:** Reduce `contentContainerStyle` padding from `paddingTop: 48` to `padding: 16` since the header now handles the top spacing.

**Verification:** `npx tsc --noEmit`. Visual: header sticks, form scrolls underneath.

---

### Task 3: Make the amount field the hero — large, prominent, with currency prefix

**Objective:** The amount is the most important field. Make it huge, centered, with the currency symbol prefix inline.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** Replace the current Amount section (label + input) with a hero-style amount block:

```tsx
{/* Amount — Hero */}
<View style={{ alignItems: "center", paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "#1A1A1A", marginBottom: 20 }}>
  <View style={{ flexDirection: "row", alignItems: "baseline" }}>
    <T variant="mono" style={{ fontSize: 18, color: colors.muted, marginRight: 4 }}>
      {currencies?.find((c) => c.id === currencyId)?.symbol ?? "$"}
    </T>
    <TextInput
      style={{
        backgroundColor: "transparent",
        borderWidth: 0,
        color: "#F5F1E8",
        fontSize: 48,
        lineHeight: 56,
        fontFamily: "IBMPlexMono",
        minWidth: 120,
        textAlign: "center",
        padding: 0,
      }}
      placeholder="0.00"
      placeholderTextColor={colors.muted}
      keyboardType="decimal-pad"
      value={amount}
      onChangeText={setAmount}
    />
  </View>
  {type && (
    <T variant="label" style={{ marginTop: 4, color: type === "income" ? colors.income : colors.expense }}>
      {type.toUpperCase()}
    </T>
  )}
</View>
```

**Step 2:** Remove the old standalone Amount label + input block (lines 241-250 in current file).

**Step 3:** The type display below the amount replaces the separate Type toggle. Move the Type toggle to below the amount hero, as a smaller secondary control.

**Verification:** Amount field is 48px, centered, with currency symbol inline. Looks like the primary interaction.

---

### Task 4: Restructure form into grouped sections with visual hierarchy

**Objective:** Fields are no longer a flat wall — they're grouped logically.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** After the amount hero, structure as:

```
[Type toggle] — smaller now, below amount
[Preset picker] — horizontal chips (new transactions only)

--- divider ---

[Category] — horizontal scroll chips, accent highlight on selected
[Currency] — horizontal chips, muted when unselected
[Account] — horizontal chips + "None" option

--- divider ---

[Date] — text input
[Notes] — multiline text input
```

**Step 2:** Add section labels for each group. Use `T variant="label"` for all labels.

**Step 3:** Use consistent spacing: `marginTop: 16` between sections, `paddingHorizontal: 16` for alignment.

**Verification:** Form feels organized into logical blocks rather than a flat list.

---

### Task 5: Polish chip selectors — unified visual language

**Objective:** All chip selectors (presets, currencies, categories, accounts) share identical styling for consistency.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** Remove the duplicate `chipStyle` and `chipTextStyle` helper functions — define them once at the top.

**Step 2:** Add a subtle pressed/selected indicator. When a chip is active:
- Background fills with accent yellow
- Text goes dark
- Border matches

When inactive:
- Transparent background
- Muted border
- Muted text

**Step 3:** For category chips, override the active color with the category's own color:
```tsx
style={[
  chipBase(selected),
  selected && c.color ? { borderColor: c.color, backgroundColor: c.color } : {},
]}
```

**Verification:** All chip rows look consistent. Category chips still use their assigned color.

---

### Task 6: Improve type toggle — more intentional placement

**Objective:** The income/expense toggle is clearer and more integrated with the amount.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** Place the type toggle directly below the amount hero, centered:

```tsx
<View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 }}>
  {(["expense", "income"] as const).map((t) => (
    <TouchableOpacity
      key={t}
      onPress={() => setType(t)}
      style={{
        borderWidth: 2,
        borderColor: type === t ? (t === "income" ? colors.income : colors.expense) : colors.muted,
        backgroundColor: type === t ? "transparent" : "transparent",
        paddingHorizontal: 24,
        paddingVertical: 8,
      }}
    >
      <T
        variant="label"
        style={{
          color: type === t ? (t === "income" ? colors.income : colors.expense) : colors.muted,
          fontSize: 13,
        }}
      >
        {t}
      </T>
    </TouchableOpacity>
  ))}
</View>
```

**Step 2:** Remove the full-width toggle pattern — it competes with the hero amount when stretched full-width.

**Verification:** Type toggle is centered, smaller, below the amount. Feels like a secondary control.

---

### Task 7: Improve delete button for edit mode

**Objective:** The delete action is clearly destructive but not screaming.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** Replace the red outlined button with a more intentional design:
- Keep the red border
- Add a subtle separator above it
- Make it full-width with muted text

**Step 2:** Move delete to the bottom of the form, after a visual separator:

```tsx
{isEdit && (
  <>
    <View style={{ height: 1, backgroundColor: "#1A1A1A", marginTop: 24, marginBottom: 16 }} />
    <TouchableOpacity onPress={handleDelete} style={{ paddingVertical: 12, alignItems: "center", borderWidth: 2, borderColor: colors.expense }}>
      <T variant="body" style={{ color: colors.expense, textTransform: "uppercase", fontSize: 14 }}>Delete</T>
    </TouchableOpacity>
  </>
)}
```

**Verification:** Delete button feels intentional, separated from the form fields.

---

### Task 8: Add EmptyAccountRow component for when no accounts exist

**Objective:** Show a clean empty state instead of just "None" when no accounts are configured.

**File:** `src/app/(app)/transaction-form.tsx`

**Step 1:** If accounts list is empty or all archived, show a muted message instead of the None chip:

```tsx
{!accounts || accounts.filter((a) => !a.archived).length === 0 ? (
  <T variant="body" style={{ color: colors.muted, fontSize: 12 }}>
    No accounts configured — go to Settings to add one
  </T>
) : (
  // existing chips
)}
```

**Verification:** Shows helpful message when no accounts exist.

---

### Task 9: Final verification

**Step 1:** `npx tsc --noEmit` — no TypeScript errors.

**Step 2:** Run the app on device:
- Create a new transaction → verify hero amount, type toggle, chip selectors all work
- Select a preset → verify form pre-fills
- Edit a transaction → verify delete button at bottom with separator
- Verify sticky header stays while scrolling

**Step 3:** `npx expo start` — hot reload picks up all changes. No server restart needed.

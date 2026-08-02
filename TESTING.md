# Finance Tracker — Manual QA Workflow (Expo Go)

Use this after any change to the offline/data layer (or before shipping a feature).
It focuses on the offline-first behavior that Phase 1 rewrote. All steps assume
you're running `npx expo start --clear` and have the app open in **Expo Go** on
your phone (USB-connected or same Wi-Fi).

> **TL;DR of what Phase 1 guarantees:** everything you do offline is queued and
> replayed in dependency order when you reconnect — including edits/deletes of
> rows you created offline, which silently failed before.

---

## 0. Pre-flight (30 seconds)

1. Open the app in Expo Go, sign in. Go to **Settings** and make a note of
   which currency/categories exist (Supabase seeds USD + 12 categories).
2. Put the phone in **Airplane Mode** (this is your offline switch). Note: with
   airplane mode on, Expo Go can't load the JS bundle from your dev server — so
   do step 1 **before** going offline, then keep the app open.
3. On the **Dashboard**, the banner should show pending items as you create them.

---

## 1. Offline → online round-trip (the core test)

**Offline (airplane mode on, app already open):**

1. **Settings → Add currency** `LBP` (`LL`, `Lebanese Pound`).
   ✅ The currency appears in the list immediately (optimistic row).
2. **Add a category** `Gym` (expense, any color).
   ✅ Appears immediately.
3. **Add a transaction** using currency `LBP` and category `Gym`, amount `25`.
   ✅ Appears at the top of the Transactions list (prepended), with the right
   currency symbol/category color.
4. **Edit** that transaction (change amount to `30`).
   ✅ Amount updates in place.
5. **Add another transaction** with a title that starts with `tmp_` (e.g.
   `tmp_ groceries`) to prove user text is never mistaken for a temp ID.
   ✅ Saves normally.
6. **Settings → Set default currency = LBP.**
   ✅ The default badge moves to LBP immediately.
7. **Dashboard** banner: pending count > 0.

**Reconnect (turn airplane mode off):**

Wait ~3–5 seconds. Then:

1. ✅ Banner pending count drops to 0, no error shown.
2. ✅ All rows still visible. Pull-to-refresh — nothing disappears.
3. ✅ Transactions list shows the LBP transaction with correct join data.
4. ✅ **Kill the app and reopen it** (still online). Everything persists
   (React Query cache + server both have it).

**Verify on the server** (optional but definitive): open the Supabase
dashboard → Table Editor → check `currencies`, `categories`, `transactions`
rows exist with real UUIDs and correct FKs (`transactions.currency_id` /
`category_id` point at the *server* IDs of the new currency/category — this is
the dependency-chain replay working).

---

## 2. Offline edit/delete of an offline-created row

(The case that was broken before Phase 1 — updates/deletes used to replay with
temp IDs and fail forever.)

1. Go offline. Create a category `Test` (appears instantly).
2. **Edit** it (rename to `Test2`) → ✅ renames in place.
3. **Delete** it → ✅ disappears from the list.
4. Reconnect. Wait 5s. Pull-to-refresh.
   ✅ No banner error. **Supabase**: category is gone entirely (insert+update+
   delete replayed in order, not just the delete).

---

## 3. Sync failure — error surfaces, nothing wedges

1. Go offline. Create a transaction referencing category `Gym`.
2. In the Supabase dashboard (on your PC, still online), **delete the `Gym`
   category** from the DB.
3. Reconnect. The transaction's insert fails (FK violation).
   ✅ Dashboard banner shows the error and pending count stays > 0.
4. **The app still works** — create another transaction normally (online).
   ✅ It saves instantly (failure of one table doesn't block others).
5. Fix the root cause (recreate the category) — nothing in the app needed:
   the queued item retries on the next connectivity change/reconnect.
   ✅ Eventually drains; banner clears.

---

## 4. Connectivity flapping / captive portal

1. Go offline, create something, reconnect immediately, go offline again,
   reconnect again — do this a few times in a row.
   ✅ No crash, no permanent "syncing" state; pending count settles at 0.
2. (Optional, harder) Join a Wi-Fi network with no internet (captive portal).
   ✅ Mutations get queued instead of erroring (`isOffline` treats
   "connected but unreachable" as offline).

---

## 5. Quick regression sweep (online-only, 2 minutes)

- [ ] Add/edit/delete a **transaction** — instant, persists after app restart
- [ ] Add/edit/archive a **preset** (presets tab → +) — instant
- [ ] Add/delete a **currency**; **set default** — instant
- [ ] Add/**archive** a category; confirm it disappears, not just greys out
- [ ] Dashboard **month navigation** still works; reports donut still renders
- [ ] Sign out → sign back in — data reloads correctly

---

## Interpreting what you see

| Symptom | Meaning |
|---|---|
| Pending count stuck > 0 with an error on the banner | An item failed (see §3). Check `lastError` text; it retries on next reconnect |
| Rows you created offline vanish after reconnect | Cache invalidation wiped them — file an issue; a table with pending items should NOT be invalidated |
| Row id looks like `tmp_...` after reconnect (visible only if you log it) | The insert never replayed — check for a queued dependency failure |
| App crashes (native) | Not a data-layer bug — check `adb logcat -b crash`; likely a version mismatch (like the Expo Go worklets issue) |

## Automated tests

`npm test` — 35 tests covering the offline queue (atomicity, id map,
dependency resolution), the CRUD factory's offline detection, and utils.
Run after any change to `src/lib/offline-queue.ts`, `src/lib/offline-crud.ts`,
`src/lib/sync-store.ts`, or the hooks. `npx tsc --noEmit` and `npx expo lint`
must stay green.

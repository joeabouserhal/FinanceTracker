-- =============================================================================
-- Finance Tracker — Supabase Schema v2
-- Run this entire script in the Supabase SQL Editor (dashboard).
-- Idempotent: safe to re-run; drops and recreates everything.
-- =============================================================================

-- =============================================================================
-- 0. Cleanup (idempotent — re-run safely)
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS create_rls_policies(text);
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS presets CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;

-- =============================================================================
-- 1. Tables
-- =============================================================================

-- Currencies the user tracks
CREATE TABLE currencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        VARCHAR(10) NOT NULL,            -- e.g. 'USD', 'LBP'
  symbol      VARCHAR(10) NOT NULL,            -- e.g. '$', 'LL'
  name        VARCHAR(50) NOT NULL,            -- e.g. 'US Dollar'
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, code)
);

-- Spending categories
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  icon        VARCHAR(50),
  color       VARCHAR(7),                      -- hex e.g. '#4C9A63'
  is_default  BOOLEAN DEFAULT false,           -- seeded at signup vs user-created
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Accounts — labels only, no balance math
CREATE TABLE accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,           -- e.g. 'Cash', 'Card'
  archived    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Presets — quick-fill templates
CREATE TABLE presets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  VARCHAR(100) NOT NULL,
  type                  VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  default_amount        INTEGER,              -- in smallest currency unit
  default_currency_id   UUID REFERENCES currencies(id) ON DELETE SET NULL,
  default_category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  default_account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  archived              BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- Transactions — the core record
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  amount        INTEGER NOT NULL,             -- smallest unit (cents)
  currency_id   UUID NOT NULL REFERENCES currencies(id) ON DELETE RESTRICT,
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  preset_id     UUID REFERENCES presets(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for common queries: user's transactions by date
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- =============================================================================
-- 2. Row Level Security
-- =============================================================================

ALTER TABLE currencies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE presets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions  ENABLE ROW LEVEL SECURITY;

-- ── currencies ──

CREATE POLICY "currencies_select" ON currencies
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "currencies_insert" ON currencies
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "currencies_update" ON currencies
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "currencies_delete" ON currencies
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ── categories ──

CREATE POLICY "categories_select" ON categories
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "categories_insert" ON categories
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "categories_update" ON categories
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "categories_delete" ON categories
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ── accounts ──

CREATE POLICY "accounts_select" ON accounts
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "accounts_insert" ON accounts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "accounts_update" ON accounts
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "accounts_delete" ON accounts
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ── presets ──

CREATE POLICY "presets_select" ON presets
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "presets_insert" ON presets
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "presets_update" ON presets
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "presets_delete" ON presets
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- ── transactions ──

CREATE POLICY "transactions_select" ON transactions
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "transactions_insert" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "transactions_update" ON transactions
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "transactions_delete" ON transactions
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =============================================================================
-- 3. Explicit Data API grants (in case auto-exposure is off)
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON currencies    TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories    TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts      TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON presets       TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions  TO authenticated, anon;

-- =============================================================================
-- 4. Signup trigger — seed default data
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_currency_id UUID;
BEGIN
  -- Default currency: USD
  INSERT INTO public.currencies (user_id, code, symbol, name, is_default)
  VALUES (NEW.id, 'USD', '$', 'US Dollar', true)
  RETURNING id INTO v_currency_id;

  -- Default expense categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
    (NEW.id, 'Groceries',     'expense', 'cart',        '#4C9A63', true),
    (NEW.id, 'Rent',          'expense', 'home',        '#E8432E', true),
    (NEW.id, 'Utilities',     'expense', 'bolt',        '#F4C430', true),
    (NEW.id, 'Transport',     'expense', 'car',         '#77746C', true),
    (NEW.id, 'Dining Out',    'expense', 'utensils',    '#E8432E', true),
    (NEW.id, 'Entertainment', 'expense', 'film',        '#4C9A63', true),
    (NEW.id, 'Health',        'expense', 'heartbeat',   '#E8432E', true),
    (NEW.id, 'Shopping',      'expense', 'bag',         '#F4C430', true),
    (NEW.id, 'Other',         'expense', 'dots-three',  '#77746C', true);

  -- Default income categories
  INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
    (NEW.id, 'Salary',        'income', 'briefcase',    '#4C9A63', true),
    (NEW.id, 'Freelance',     'income', 'laptop',       '#4C9A63', true),
    (NEW.id, 'Other Income',  'income', 'plus-circle',  '#77746C', true);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- 5. Verification queries (run after to confirm everything works)
-- =============================================================================

-- Check tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check trigger exists:
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table = 'users' AND event_object_schema = 'auth';

export interface Currency {
  id: string;
  user_id: string;
  code: string;
  symbol: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  archived: boolean;
  created_at: string;
}

export interface Preset {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  default_amount: number | null;
  default_currency_id: string | null;
  default_category_id: string | null;
  default_account_id: string | null;
  archived: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  currency_id: string;
  category_id: string;
  account_id: string | null;
  date: string;
  notes: string | null;
  preset_id: string | null;
  created_at: string;
  updated_at: string;
}

// Insert types (omit auto-generated fields)
export type CurrencyInsert = Pick<Currency, "code" | "symbol" | "name" | "is_default">;
export type CategoryInsert = Pick<Category, "name" | "type" | "icon" | "color">;
export type AccountInsert = Pick<Account, "name">;
export type PresetInsert = Pick<
  Preset,
  "name" | "type" | "default_amount" | "default_currency_id" | "default_category_id" | "default_account_id"
>;
export type TransactionInsert = Pick<
  Transaction,
  "type" | "amount" | "currency_id" | "category_id" | "account_id" | "date" | "notes" | "preset_id"
>;

// Update types
export type CurrencyUpdate = Partial<Pick<Currency, "code" | "symbol" | "name" | "is_default">>;
export type CategoryUpdate = Partial<Pick<Category, "name" | "type" | "icon" | "color">>;
export type AccountUpdate = Partial<Pick<Account, "name" | "archived">>;
export type PresetUpdate = Partial<Pick<Preset, "name" | "type" | "default_amount" | "default_currency_id" | "default_category_id" | "default_account_id" | "archived">>;
export type TransactionUpdate = Partial<Pick<Transaction, "type" | "amount" | "currency_id" | "category_id" | "account_id" | "date" | "notes">>;

// Transaction with joined relations (for display)
export interface TransactionWithRelations extends Transaction {
  currency?: Currency;
  category?: Category;
  account?: Account | null;
}

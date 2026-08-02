// Jest setup for pure-logic tests (no component rendering).
// Runs before every test file.

// Official in-memory AsyncStorage mock (offline-queue tests).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Official NetInfo mock (useNetworkStatus module load).
jest.mock("@react-native-community/netinfo", () =>
  require("@react-native-community/netinfo/jest/netinfo-mock"),
);

// src/lib/supabase.ts reads these at module load; without them createClient throws.
process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

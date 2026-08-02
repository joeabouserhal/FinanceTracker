import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Stack, ThemeProvider, DarkTheme } from "expo-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, asyncStoragePersister } from "@/lib/query-client";
import { OfflineSyncProvider } from "@/components/OfflineSyncProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useBiometricStore } from "@/lib/biometric-store";
import { useTheme, useThemeStore } from "@/theme/store";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

/** Subscribes NetInfo (returns unsubscribe). Kept separate from the async
 *  one-time inits so it runs once the app tree renders. */
function NetworkInit() {
  const initialize = useNetworkStatus((s) => s.initialize);
  useEffect(() => initialize(), [initialize]);
  return null;
}

export default function RootLayout() {
  const theme = useTheme();
  const themeReady = useThemeStore((s) => s.ready);
  const initializeTheme = useThemeStore((s) => s.initialize);
  const initializeBiometric = useBiometricStore((s) => s.initialize);
  const [fontsLoaded] = useFonts({
    ArchivoBlack: require("@expo-google-fonts/archivo-black/400Regular/ArchivoBlack_400Regular.ttf"),
    IBMPlexSans: require("@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf"),
    IBMPlexMono: require("@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf"),
  });

  // One-time async inits live in RootLayout (always mounted) — NOT in a
  // child component, or a `return null` gate below would deadlock them.
  useEffect(() => {
    initializeTheme();
    initializeBiometric();
  }, [initializeTheme, initializeBiometric]);

  useEffect(() => {
    if (fontsLoaded && themeReady) SplashScreen.hideAsync();
  }, [fontsLoaded, themeReady]);

  if (!fontsLoaded || !themeReady) return null;

  const navTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: theme.accent,
      background: theme.background,
      card: theme.background,
      text: theme.ink,
      border: theme.border,
      notification: theme.expense,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
        <NetworkInit />
        <OfflineSyncProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="transaction-form" />
            <Stack.Screen name="preset-form" />
          </Stack>
        </OfflineSyncProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

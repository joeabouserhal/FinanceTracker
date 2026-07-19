import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Slot } from "expo-router";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, asyncStoragePersister } from "@/lib/query-client";
import { OfflineSyncProvider } from "@/components/OfflineSyncProvider";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

function AppInit({ children }: { children: React.ReactNode }) {
  const initialize = useNetworkStatus((s) => s.initialize);

  useEffect(() => {
    const unsub = initialize();
    return () => unsub();
  }, []);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoBlack: require("@expo-google-fonts/archivo-black/400Regular/ArchivoBlack_400Regular.ttf"),
    IBMPlexSans: require("@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf"),
    IBMPlexMono: require("@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <AppInit>
        <OfflineSyncProvider>
          <StatusBar style="light" />
          <Slot />
        </OfflineSyncProvider>
      </AppInit>
    </PersistQueryClientProvider>
  );
}

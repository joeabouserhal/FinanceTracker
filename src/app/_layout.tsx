import { useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Slot } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoBlack: require("@expo-google-fonts/archivo-black/400Regular/ArchivoBlack_400Regular.ttf"),
    IBMPlexSans: require("@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf"),
    IBMPlexMono: require("@expo-google-fonts/ibm-plex-mono/400Regular/IBMPlexMono_400Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Slot />
    </QueryClientProvider>
  );
}

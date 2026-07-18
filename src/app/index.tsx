import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { session, loading, initialized, initialize } = useAuth();

  useEffect(() => {
    initialize();
  }, []);

  if (!initialized || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0A0A0A" }}>
        <ActivityIndicator color="#F4C430" size="large" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

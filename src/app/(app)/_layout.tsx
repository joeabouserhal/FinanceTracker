import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BiometricGate } from "@/components/BiometricGate";
import { colors } from "@/theme/colors";

function TabIcon({ name, focused }: { name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; focused: boolean }) {
  return <MaterialCommunityIcons name={name} size={24} color={focused ? colors.accent : colors.muted} />;
}

export default function AppLayout() {
  const insets = useSafeAreaInsets();

  return (
    <BiometricGate>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderTopColor: "#1A1A1A",
            height: 64 + insets.bottom,
            paddingTop: 4,
            paddingBottom: 14 + insets.bottom,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontFamily: "ArchivoBlack", fontSize: 9 },
        }}
      >
        <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon name="view-dashboard" focused={focused} /> }} />
        <Tabs.Screen name="transactions" options={{ title: "Transact", tabBarIcon: ({ focused }) => <TabIcon name="swap-vertical" focused={focused} /> }} />
        <Tabs.Screen name="presets" options={{ title: "Presets", tabBarIcon: ({ focused }) => <TabIcon name="bookmark-multiple" focused={focused} /> }} />
        <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ focused }) => <TabIcon name="cog" focused={focused} /> }} />
        <Tabs.Screen name="reports" options={{ title: "Reports", tabBarIcon: ({ focused }) => <TabIcon name="chart-bar" focused={focused} /> }} />
      </Tabs>
    </BiometricGate>
  );
}

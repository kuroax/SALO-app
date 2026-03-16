import { Tabs } from "expo-router";

// TODO: Add tab icons when building components/ui/ design system.
// TODO: Move hardcoded colors to constants/Colors.ts.

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#f3f4f6" },
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
      <Tabs.Screen name="customers" options={{ title: "Customers" }} />
    </Tabs>
  );
}

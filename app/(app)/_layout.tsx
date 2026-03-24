import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

// ─── Icon map ─────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<
  string,
  { active: IoniconsName; inactive: IoniconsName }
> = {
  index: { active: "grid", inactive: "grid-outline" },
  orders: { active: "receipt", inactive: "receipt-outline" },
  inventory: { active: "cube", inactive: "cube-outline" },
  customers: { active: "people", inactive: "people-outline" },
};

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout() {
  // FIX: useColorScheme() can return 'unspecified' on some Expo versions.
  // Narrow explicitly to 'light' | 'dark' before indexing Colors.
  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";
  const C = Colors[scheme];

  return (
    <Tabs
      screenOptions={({ route }) => {
        const icons = TAB_ICONS[route.name] ?? {
          active: "ellipsis-horizontal",
          inactive: "ellipsis-horizontal-outline",
        };

        return {
          headerShown: false,

          tabBarStyle: {
            backgroundColor: C.tabBar,
            borderTopColor: C.tabBorder,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },

          tabBarActiveTintColor: C.tabActive,
          tabBarInactiveTintColor: C.tabInactive,

          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600",
            letterSpacing: 0.3,
          },

          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={size ?? 22}
              color={color}
            />
          ),
        };
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="inventory" options={{ title: "Inventory" }} />
      <Tabs.Screen name="customers" options={{ title: "Customers" }} />
    </Tabs>
  );
}

import { useColors } from "@/lib/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { type ComponentProps } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

// ─── Tab icon ─────────────────────────────────────────────────────────────────

function TabIcon({
  icon,
  iconActive,
  label,
  focused,
  accentColor,
}: {
  icon: IoniconsName;
  iconActive: IoniconsName;
  label: string;
  focused: boolean;
  accentColor: string;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: focused ? "#2e2e2e" : "transparent",
        minWidth: 52,
      }}
    >
      {focused && (
        <View
          style={{
            position: "absolute",
            top: 0,
            width: 20,
            height: 2,
            borderRadius: 1,
            backgroundColor: accentColor,
          }}
        />
      )}
      <Ionicons
        name={focused ? iconActive : icon}
        size={20}
        color={focused ? accentColor : "#5a5550"}
      />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 9,
          fontWeight: focused ? "700" : "500",
          color: focused ? accentColor : "#5a5550",
          marginTop: 2,
          letterSpacing: 0.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const C = useColors(); // dynamic accent from theme store
  const insets = useSafeAreaInsets();

  const tabBarStyle = {
    position: "absolute" as const,
    backgroundColor: "#1c1c1c",
    borderTopWidth: 0,
    borderRadius: 26,
    marginHorizontal: 12,
    marginBottom: Math.max(insets.bottom, 8),
    height: 62,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    paddingBottom: 0,
    paddingTop: 0,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: "#5a5550",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="grid-outline"
              iconActive="grid"
              label="Home"
              focused={focused}
              accentColor={C.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="receipt-outline"
              iconActive="receipt"
              label="Orders"
              focused={focused}
              accentColor={C.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="cube-outline"
              iconActive="cube"
              label="Inventory"
              focused={focused}
              accentColor={C.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="people-outline"
              iconActive="people"
              label="Customers"
              focused={focused}
              accentColor={C.accent}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon="ellipsis-horizontal-circle-outline"
              iconActive="ellipsis-horizontal-circle"
              label="More"
              focused={focused}
              accentColor={C.accent}
            />
          ),
        }}
      />
    </Tabs>
  );
}

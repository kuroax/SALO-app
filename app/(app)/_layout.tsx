import { useColors } from "@/lib/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { type ComponentProps } from "react";
import {
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type IoniconsName = ComponentProps<typeof Ionicons>["name"];

const TAB_BAR_HEIGHT = 64;

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabDef = {
  name: "index" | "orders" | "inventory" | "customers" | "more";
  label: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
};

const TABS: readonly TabDef[] = [
  { name: "index", label: "Home", icon: "grid-outline", iconActive: "grid" },
  {
    name: "orders",
    label: "Orders",
    icon: "receipt-outline",
    iconActive: "receipt",
  },
  {
    name: "inventory",
    label: "Inventory",
    icon: "cube-outline",
    iconActive: "cube",
  },
  {
    name: "customers",
    label: "Customers",
    icon: "people-outline",
    iconActive: "people",
  },
  {
    name: "more",
    label: "More",
    icon: "ellipsis-horizontal-circle-outline",
    iconActive: "ellipsis-horizontal-circle",
  },
];

function tabHref(name: TabDef["name"]): string {
  return name === "index" ? "/" : `/${name}`;
}

function isActive(name: TabDef["name"], pathname: string): boolean {
  if (name === "index") return pathname === "/";
  return pathname === `/${name}` || pathname.startsWith(`/${name}/`);
}

// ─── Custom tab button ────────────────────────────────────────────────────────
// tabBarButton completely replaces React Navigation's item wrapper,
// so we own the height, padding and centering — no internal offsets to fight.

function makeTabButton(tab: TabDef, tabWidth: number) {
  return function TabButton() {
    const C = useColors();
    const router = useRouter();
    const pathname = usePathname();
    const focused = isActive(tab.name, pathname);

    return (
      <TouchableOpacity
        onPress={() => router.navigate(tabHref(tab.name) as never)}
        activeOpacity={0.75}
        style={{
          width: tabWidth,
          height: TAB_BAR_HEIGHT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 7,
            paddingHorizontal: 4,
            borderRadius: 18,
            backgroundColor: focused ? C.surfaceElevated : "transparent",
            width: tabWidth - 6,
          }}
        >
          {focused && (
            <View
              style={{
                position: "absolute",
                top: 0,
                width: 16,
                height: 2,
                borderRadius: 1,
                backgroundColor: C.accent,
              }}
            />
          )}

          <Ionicons
            name={focused ? tab.iconActive : tab.icon}
            size={20}
            color={focused ? C.accent : C.tabInactive}
          />

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              fontSize: 10,
              fontWeight: focused ? "700" : "400",
              color: focused ? C.accent : C.tabInactive,
              marginTop: 3,
              letterSpacing: 0,
              textAlign: "center",
              width: tabWidth - 12,
            }}
          >
            {tab.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const C = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const PILL_MARGIN = 4;
  const pillWidth = width - PILL_MARGIN * 2;
  const tabWidth = pillWidth / TABS.length;

  const tabBarStyle = {
    position: "absolute" as const,
    backgroundColor: C.tabBar,
    borderTopWidth: 0,
    borderRadius: 28,
    left: PILL_MARGIN,
    right: PILL_MARGIN,
    marginBottom: Math.max(insets.bottom - 2, 6),
    height: TAB_BAR_HEIGHT,
    width: pillWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    paddingBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle,
          tabBarItemStyle: {
            padding: 0,
            margin: 0,
            height: TAB_BAR_HEIGHT,
            width: tabWidth,
          },
          sceneStyle: { backgroundColor: "transparent" },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              tabBarButton: makeTabButton(tab, tabWidth),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

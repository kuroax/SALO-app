import { Colors } from "@/constants/Colors";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function MoreLayout() {
  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";
  const C = Colors[scheme];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-member" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}

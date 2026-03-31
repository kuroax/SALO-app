import { useColors } from "@/lib/hooks/useColors";
import { Stack } from "expo-router";

export default function MoreLayout() {
  const C = useColors();

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

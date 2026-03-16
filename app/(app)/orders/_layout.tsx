import { Stack } from "expo-router";

// Stack navigator for the Orders tab.
// Handles list → detail navigation without affecting the tab bar.
// TODO: Add [id] screen declaration when orders/[id].tsx is created.
export default function OrdersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

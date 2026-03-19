import { Stack } from "expo-router";

// Stack navigator for the Inventory tab.
// Handles product list → variant detail navigation without affecting the tab bar.
export default function InventoryLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[productId]" />
    </Stack>
  );
}

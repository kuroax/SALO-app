import { Stack } from "expo-router";

// Stack navigator for the Customers tab.
// Handles list → detail navigation without affecting the tab bar.
export default function CustomersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

import { Stack } from "expo-router";

// Stack navigator for the Customers tab.
// Handles list → detail navigation without affecting the tab bar.
// TODO: Add [id] screen declaration when customers/[id].tsx is created.
export default function CustomersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

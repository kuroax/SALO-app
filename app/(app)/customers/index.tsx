import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function DashboardScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  return (
    <View className="flex-1 bg-white px-6 py-10">
      <View className="mb-10">
        <Text className="mb-2 text-3xl font-bold text-gray-900">SALO</Text>
        <Text className="text-base text-gray-500">Owner Dashboard</Text>
      </View>

      <View className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Welcome back
        </Text>
        <Text className="text-sm leading-6 text-gray-600">
          Manage orders, inventory, and customers from one place.
        </Text>
      </View>

      <View className="gap-3">
        <TouchableOpacity
          className="rounded-2xl bg-gray-900 px-5 py-4"
          onPress={() => router.navigate("/(app)/orders")}
        >
          <Text className="text-base font-semibold text-white">
            Go to Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="rounded-2xl border border-gray-200 bg-white px-5 py-4"
          onPress={() => router.navigate("/(app)/inventory")}
        >
          <Text className="text-base font-semibold text-gray-900">
            Go to Inventory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="rounded-2xl border border-gray-200 bg-white px-5 py-4"
          onPress={() => router.navigate("/(app)/customers")}
        >
          <Text className="text-base font-semibold text-gray-900">
            Go to Customers
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mt-auto pt-8">
        <TouchableOpacity
          className="items-center rounded-2xl border border-red-200 bg-red-50 px-5 py-4"
          onPress={logout}
        >
          <Text className="text-base font-semibold text-red-600">Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

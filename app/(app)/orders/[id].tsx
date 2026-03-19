import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-gray-50 items-center justify-center">
      <Text className="text-gray-900 text-lg font-semibold">Order {id}</Text>
    </View>
  );
}

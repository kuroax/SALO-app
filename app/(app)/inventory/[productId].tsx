import { Card } from "@/components/ui/Card";
import {
    ADD_STOCK,
    REMOVE_STOCK,
} from "@/lib/graphql/mutations/inventory.mutations";
import { GET_PRODUCT_INVENTORY } from "@/lib/graphql/queries/inventory.queries";
import { useMutation, useQuery } from "@apollo/client/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryItem = {
  id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
};

type GetProductInventoryData = {
  productInventory: InventoryItem[];
};

// ─── Variant Row ──────────────────────────────────────────────────────────────

type VariantRowProps = {
  item: InventoryItem;
  onAdd: () => void;
  onRemove: () => void;
  isLoading: boolean;
};

function VariantRow({ item, onAdd, onRemove, isLoading }: VariantRowProps) {
  return (
    <View
      className={[
        "flex-row items-center justify-between py-3",
        item.isLowStock ? "opacity-100" : "opacity-100",
      ].join(" ")}
    >
      {/* ── Variant info ────────────────────────────────────────────────── */}
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">
          {item.size} · {item.color}
        </Text>
        {item.isLowStock && (
          <Text className="mt-0.5 text-xs font-medium text-amber-600">
            Low stock · threshold {item.lowStockThreshold}
          </Text>
        )}
      </View>

      {/* ── Stock controls ──────────────────────────────────────────────── */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onRemove}
          disabled={isLoading || item.quantity === 0}
          className="h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white"
          style={{ opacity: isLoading || item.quantity === 0 ? 0.4 : 1 }}
        >
          <Text className="text-base font-bold text-gray-700">−</Text>
        </Pressable>

        <Text
          className={[
            "w-8 text-center text-base font-bold",
            item.isLowStock ? "text-amber-600" : "text-gray-900",
          ].join(" ")}
        >
          {item.quantity}
        </Text>

        <Pressable
          onPress={onAdd}
          disabled={isLoading}
          className="h-8 w-8 items-center justify-center rounded-full border border-gray-900 bg-gray-900"
          style={{ opacity: isLoading ? 0.4 : 1 }}
        >
          <Text className="text-base font-bold text-white">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Product Inventory Screen ─────────────────────────────────────────────────

export default function ProductInventoryScreen() {
  const { productId, productName } = useLocalSearchParams<{
    productId: string;
    productName: string;
  }>();
  const router = useRouter();

  const validProductId =
    typeof productId === "string" && productId.length > 0 ? productId : null;

  const refetchInventory = [
    { query: GET_PRODUCT_INVENTORY, variables: { productId: validProductId } },
  ];

  const { data, loading, error } = useQuery<GetProductInventoryData>(
    GET_PRODUCT_INVENTORY,
    {
      variables: { productId: validProductId },
      skip: !validProductId,
    },
  );

  const [addStock, { loading: adding }] = useMutation(ADD_STOCK, {
    refetchQueries: refetchInventory,
  });
  const [removeStock, { loading: removing }] = useMutation(REMOVE_STOCK, {
    refetchQueries: refetchInventory,
  });

  const isLoading = adding || removing;

  const handleAdd = (item: InventoryItem) => {
    addStock({
      variables: {
        input: {
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: 1,
        },
      },
    }).catch((err) => {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to add stock",
      );
    });
  };

  const handleRemove = (item: InventoryItem) => {
    if (item.quantity === 0) return;
    removeStock({
      variables: {
        input: {
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: 1,
        },
      },
    }).catch((err) => {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to remove stock",
      );
    });
  };

  // ── Invalid id ─────────────────────────────────────────────────────────────
  if (!validProductId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="text-lg font-semibold text-gray-900">
          Invalid product
        </Text>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Couldn't load inventory
        </Text>
        <Text className="text-center text-sm text-gray-500">
          {error.message}
        </Text>
      </View>
    );
  }

  const items = data?.productInventory ?? [];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View className="bg-white px-5 pb-4 pt-14">
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/inventory")
          }
          className="mb-3"
        >
          <Text className="text-sm font-medium text-gray-500">← Inventory</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
          {productName ?? "Product"}
        </Text>
        <Text className="mt-0.5 text-sm text-gray-500">
          {items.length} {items.length === 1 ? "variant" : "variants"}
        </Text>
      </View>

      <View className="px-5 pt-5">
        {items.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-lg font-semibold text-gray-900">
              No variants tracked
            </Text>
            <Text className="mt-1 text-center text-sm text-gray-500">
              Use the API or Apollo Sandbox to add stock for this product.
            </Text>
          </View>
        ) : (
          <Card variant="white" padding="md">
            {items.map((item, index) => (
              <View key={`${item.size}-${item.color}`}>
                <VariantRow
                  item={item}
                  onAdd={() => handleAdd(item)}
                  onRemove={() => handleRemove(item)}
                  isLoading={isLoading}
                />
                {index < items.length - 1 && (
                  <View className="border-b border-gray-100" />
                )}
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

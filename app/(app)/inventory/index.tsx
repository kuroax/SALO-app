import { Card } from "@/components/ui/Card";
import { GET_LOW_STOCK } from "@/lib/graphql/queries/inventory.queries";
import { LIST_PRODUCTS } from "@/lib/graphql/queries/product.queries";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductVariant = {
  size: string;
  color: string;
};

type Product = {
  id: string;
  name: string;
  brand: string;
  status: string;
  variants: ProductVariant[];
};

type ListProductsData = {
  products: {
    products: Product[];
    total: number;
  };
};

type LowStockData = {
  lowStock: { productId: string }[];
};

// ─── Product Card ─────────────────────────────────────────────────────────────

type ProductCardProps = {
  product: Product;
  hasLowStock: boolean;
  onPress: () => void;
};

function ProductCard({ product, hasLowStock, onPress }: ProductCardProps) {
  const variantCount = product.variants.length;

  return (
    <View className="mb-3">
      <Card variant="white" padding="md" onPress={onPress}>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
              {product.name}
            </Text>
            <Text className="mt-0.5 text-xs text-gray-500">
              {product.brand}
            </Text>
          </View>
          {hasLowStock && (
            <View className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5">
              <Text className="text-xs font-semibold text-amber-700">
                Low Stock
              </Text>
            </View>
          )}
        </View>
        <Text className="mt-3 text-xs text-gray-400">
          {variantCount} {variantCount === 1 ? "variant" : "variants"}
        </Text>
      </Card>
    </View>
  );
}

// ─── Inventory Screen ─────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery<ListProductsData>(LIST_PRODUCTS, {
    variables: { filters: { status: "active", limit: 50 } },
  });

  const { data: lowStockData, refetch: refetchLowStock } =
    useQuery<LowStockData>(GET_LOW_STOCK);

  const products = productsData?.products.products ?? [];

  // Build a Set of productIds that have at least one low stock variant.
  const lowStockProductIds = new Set(
    lowStockData?.lowStock.map((item) => item.productId) ?? [],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchProducts(), refetchLowStock()]);
    setRefreshing(false);
  };

  if (productsLoading && !productsData) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (productsError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Couldn't load inventory
        </Text>
        <Text className="text-center text-sm text-gray-500">
          {productsError.message}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View className="bg-white px-5 pb-4 pt-14">
        <Text className="text-2xl font-bold text-gray-900">Inventory</Text>
        {products.length > 0 && (
          <Text className="mt-0.5 text-sm text-gray-500">
            {products.length} {products.length === 1 ? "product" : "products"}
          </Text>
        )}
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="mb-2 text-lg font-semibold text-gray-900">
              No products yet
            </Text>
            <Text className="text-center text-sm text-gray-500">
              Add products to start tracking inventory.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#111827"
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            hasLowStock={lowStockProductIds.has(item.id)}
            onPress={() =>
              router.push({
                pathname: "/inventory/[productId]",
                params: { productId: item.id, productName: item.name },
              })
            }
          />
        )}
      />
    </View>
  );
}

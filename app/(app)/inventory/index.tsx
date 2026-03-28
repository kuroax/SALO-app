import type { ThemeColors } from "@/constants/Colors";
import { GET_LOW_STOCK } from "@/lib/graphql/queries/inventory.queries";
import { LIST_PRODUCTS } from "@/lib/graphql/queries/product.queries";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  useColorScheme,
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

function ProductCard({
  product,
  hasLowStock,
  onPress,
  C,
}: {
  product: Product;
  hasLowStock: boolean;
  onPress: () => void;
  C: ThemeColors;
}) {
  const variantCount = product.variants.length;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: hasLowStock ? C.pending + "40" : C.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text
            style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}
            numberOfLines={1}
          >
            {product.name}
          </Text>
          <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 3 }}>
            {product.brand}
          </Text>
        </View>

        {hasLowStock && (
          <View
            style={{
              backgroundColor: C.pendingBg,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: 1,
              borderColor: C.pending + "40",
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: C.pending }}>
              Low Stock
            </Text>
          </View>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <Text style={{ fontSize: 12, color: C.textTertiary }}>
          {variantCount} {variantCount === 1 ? "variant" : "variants"}
        </Text>
        <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ C }: { C: ThemeColors }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        paddingVertical: 80,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          backgroundColor: C.accentMuted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name="cube-outline" size={28} color={C.accent} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: 6,
        }}
      >
        No products yet
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: C.textTertiary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        Add products to start tracking inventory.
      </Text>
    </View>
  );
}

// ─── Inventory Screen ─────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();
  const raw = useColorScheme();
  const _scheme: "light" | "dark" = raw === "light" ? "light" : "dark";

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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.background,
        }}
      >
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (productsError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.background,
          paddingHorizontal: 32,
        }}
      >
        <Ionicons
          name="alert-circle-outline"
          size={40}
          color={C.alert}
          style={{ marginBottom: 12 }}
        />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: C.textPrimary,
            marginBottom: 6,
          }}
        >
          Couldn't load inventory
        </Text>
        <Text
          style={{ fontSize: 13, color: C.textTertiary, textAlign: "center" }}
        >
          {productsError.message}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <View style={{ flex: 1, backgroundColor: C.background }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: C.background,
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: C.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            Inventory
          </Text>
          {products.length > 0 && (
            <Text
              style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}
            >
              {products.length} {products.length === 1 ? "product" : "products"}
            </Text>
          )}
        </View>

        {/* ── List ────────────────────────────────────────────────────── */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 120,
            flexGrow: 1,
          }}
          ListEmptyComponent={<EmptyState C={C} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.accent}
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
              C={C}
            />
          )}
        />

        {/* ── FAB ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => router.push("/inventory/add-product")}
          activeOpacity={0.85}
          style={{
            position: "absolute",
            bottom: 100,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

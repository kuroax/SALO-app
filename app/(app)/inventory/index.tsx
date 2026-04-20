import type { ThemeColors } from "@/constants/Colors";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Queries ──────────────────────────────────────────────────────────────────

const LIST_PRODUCTS_WITH_IMAGES = gql`
  query ListProductsWithImages($filters: ListProductsInput) {
    products(filters: $filters) {
      products {
        id
        name
        brand
        status
        images
        categoryGroup
        subcategory
        variants {
          size
          color
        }
      }
      total
    }
  }
`;

// Includes size so we can cross-reference against active product variants
// and avoid showing Low Stock for deselected sizes that still have stale
// inventory records in the database.
const GET_LOW_STOCK_WITH_SIZE = gql`
  query GetLowStockWithSize {
    lowStock {
      productId
      size
    }
  }
`;

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
  images: string[];
  categoryGroup?: string;
  subcategory?: string;
  variants: ProductVariant[];
};

type ListProductsData = {
  products: {
    products: Product[];
    total: number;
  };
};

type LowStockItem = {
  productId: string;
  size: string;
};

type LowStockData = {
  lowStock: LowStockItem[];
};

// ─── Filter Chips ─────────────────────────────────────────────────────────────

function FilterChips({
  options,
  selected,
  onSelect,
  C,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  C: ThemeColors;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20 }}
    >
      {options.map((opt, i) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: active ? C.accent : C.surface,
              borderWidth: 1,
              borderColor: active ? C.accent : C.border,
              marginRight: i < options.length - 1 ? 8 : 0,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "700" : "500",
                color: active ? C.background : C.textSecondary,
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

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
  const imageUrl = product.images?.[0] ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: hasLowStock ? C.pending + "40" : C.border,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          backgroundColor: C.background,
          borderWidth: 1,
          borderColor: C.border,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 14,
          flexShrink: 0,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="cube-outline" size={26} color={C.textTertiary} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}
              numberOfLines={1}
            >
              {product.name}
            </Text>
            <Text
              style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}
            >
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
              <Text
                style={{ fontSize: 10, fontWeight: "700", color: C.pending }}
              >
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
            marginTop: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: C.textTertiary }}>
            {variantCount} {variantCount === 1 ? "variant" : "variants"}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
        </View>
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
        No products found
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: C.textTertiary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        Try adjusting your search or filters.
      </Text>
    </View>
  );
}

// ─── Inventory Screen ─────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");

  const {
    data: productsData,
    loading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery<ListProductsData>(LIST_PRODUCTS_WITH_IMAGES, {
    variables: { filters: { status: "active", limit: 50 } },
  });

  const { data: lowStockData, refetch: refetchLowStock } =
    useQuery<LowStockData>(GET_LOW_STOCK_WITH_SIZE);

  const products = productsData?.products.products ?? [];

  // ── Build active variant map for low stock filtering ──────────────────────
  // Maps productId → Set of active size strings (uppercase)
  // Used to exclude stale inventory records from deselected sizes
  const productVariantMap = new Map(
    products.map((p) => [
      p.id,
      new Set(p.variants.map((v) => v.size.toUpperCase())),
    ]),
  );

  // A product only gets the Low Stock badge if the low stock inventory record
  // belongs to a size that is still active in product.variants
  const lowStockProductIds = new Set(
    (lowStockData?.lowStock ?? [])
      .filter((item) => {
        const activeSizes = productVariantMap.get(item.productId);
        if (!activeSizes) return false;
        return activeSizes.has(item.size?.toUpperCase());
      })
      .map((item) => item.productId),
  );

  // ── Derive filter options from loaded products ─────────────────────────────

  const categoryGroups = [
    "All",
    ...Array.from(
      new Set(
        products
          .map((p) => p.categoryGroup)
          .filter((c): c is string => Boolean(c)),
      ),
    ).sort(),
  ];

  const subcategoryOptions = [
    "All",
    ...Array.from(
      new Set(
        products
          .filter(
            (p) =>
              selectedCategory === "All" ||
              p.categoryGroup === selectedCategory,
          )
          .map((p) => p.subcategory)
          .filter((s): s is string => Boolean(s)),
      ),
    ).sort(),
  ];

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setSelectedSubcategory("All");
  };

  // ── Filter products ────────────────────────────────────────────────────────

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q);
    const matchesCategory =
      selectedCategory === "All" || p.categoryGroup === selectedCategory;
    const matchesSubcategory =
      selectedSubcategory === "All" || p.subcategory === selectedSubcategory;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  const hasActiveFilters =
    selectedCategory !== "All" ||
    selectedSubcategory !== "All" ||
    searchQuery.trim().length > 0;

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
            paddingTop: 64,
            paddingBottom: 12,
          }}
        >
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
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
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "product" : "products"}
                {hasActiveFilters ? " found" : ""}
              </Text>
            )}
          </View>

          {/* Search bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: C.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 12,
              marginHorizontal: 20,
              marginBottom: 12,
            }}
          >
            <Ionicons
              name="search-outline"
              size={16}
              color={C.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name or brand…"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                paddingVertical: 10,
                fontSize: 14,
                color: C.textPrimary,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={C.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>

          {categoryGroups.length > 1 && (
            <View style={{ marginBottom: 8 }}>
              <FilterChips
                options={categoryGroups}
                selected={selectedCategory}
                onSelect={handleCategorySelect}
                C={C}
              />
            </View>
          )}

          {selectedCategory !== "All" && subcategoryOptions.length > 1 && (
            <View style={{ marginBottom: 4 }}>
              <FilterChips
                options={subcategoryOptions}
                selected={selectedSubcategory}
                onSelect={setSelectedSubcategory}
                C={C}
              />
            </View>
          )}

          {hasActiveFilters && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setSelectedSubcategory("All");
              }}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                marginHorizontal: 20,
                marginTop: 8,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: C.alertBg,
                borderWidth: 1,
                borderColor: C.alert + "30",
              }}
            >
              <Ionicons
                name="close-circle-outline"
                size={13}
                color={C.alert}
                style={{ marginRight: 4 }}
              />
              <Text style={{ fontSize: 12, fontWeight: "600", color: C.alert }}>
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── List ────────────────────────────────────────────────────── */}
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
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
          <Ionicons name="add" size={28} color={C.background} />
        </TouchableOpacity>
      </View>
    </>
  );
}

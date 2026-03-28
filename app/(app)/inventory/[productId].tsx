import type { ThemeColors } from "@/constants/Colors";
import {
  ADD_STOCK,
  REMOVE_STOCK,
} from "@/lib/graphql/mutations/inventory.mutations";
import { GET_PRODUCT_INVENTORY } from "@/lib/graphql/queries/inventory.queries";
import { useColors } from "@/lib/hooks/useColors";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
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

function VariantRow({
  item,
  onAdd,
  onRemove,
  isLoading,
  isLast,
  C,
}: {
  item: InventoryItem;
  onAdd: () => void;
  onRemove: () => void;
  isLoading: boolean;
  isLast: boolean;
  C: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      {/* Variant info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.textPrimary }}>
          {item.size} · {item.color}
        </Text>
        {item.isLowStock && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: C.pending,
              marginTop: 2,
            }}
          >
            Low stock · threshold {item.lowStockThreshold}
          </Text>
        )}
      </View>

      {/* Stock controls */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Remove button */}
        <TouchableOpacity
          onPress={onRemove}
          disabled={isLoading || item.quantity === 0}
          activeOpacity={0.7}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading || item.quantity === 0 ? 0.35 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: C.textPrimary,
              lineHeight: 22,
            }}
          >
            −
          </Text>
        </TouchableOpacity>

        {/* Quantity */}
        <Text
          style={{
            width: 40,
            textAlign: "center",
            fontSize: 16,
            fontWeight: "700",
            color: item.isLowStock ? C.pending : C.textPrimary,
          }}
        >
          {item.quantity}
        </Text>

        {/* Add button */}
        <TouchableOpacity
          onPress={onAdd}
          disabled={isLoading}
          activeOpacity={0.7}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading ? 0.35 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#fff",
              lineHeight: 22,
            }}
          >
            +
          </Text>
        </TouchableOpacity>
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
  const C = useColors();
  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";

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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.background,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}>
          Invalid product
        </Text>
      </View>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
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

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
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
          {error.message}
        </Text>
      </View>
    );
  }

  const items = data?.productInventory ?? [];
  const lowCount = items.filter((i) => i.isLowStock).length;

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/inventory")
            }
            activeOpacity={0.6}
            style={{
              alignSelf: "flex-start",
              marginBottom: 32,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="arrow-back" size={16} color={C.accent} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: C.accent,
                  marginLeft: 4,
                }}
              >
                Inventory
              </Text>
            </View>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: C.textPrimary,
              letterSpacing: -0.5,
            }}
            numberOfLines={1}
          >
            {productName ?? "Product"}
          </Text>

          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}
          >
            <Text style={{ fontSize: 13, color: C.textSecondary }}>
              {items.length} {items.length === 1 ? "variant" : "variants"}
            </Text>
            {lowCount > 0 && (
              <View
                style={{
                  backgroundColor: C.pendingBg,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  marginLeft: 10,
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: "700", color: C.pending }}
                >
                  {lowCount} low stock
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {items.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: C.accentMuted,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Ionicons name="cube-outline" size={24} color={C.accent} />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: C.textPrimary,
                  marginBottom: 6,
                }}
              >
                No variants tracked
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: C.textTertiary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Add stock via the API or Apollo Sandbox to begin tracking this
                product.
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                overflow: "hidden",
              }}
            >
              {items.map((item, index) => (
                <VariantRow
                  key={`${item.size}-${item.color}`}
                  item={item}
                  onAdd={() => handleAdd(item)}
                  onRemove={() => handleRemove(item)}
                  isLoading={isLoading}
                  isLast={index === items.length - 1}
                  C={C}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

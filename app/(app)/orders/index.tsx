import { type ThemeColors } from "@/constants/Colors";
import { LIST_ORDERS } from "@/lib/graphql/queries/order.queries";
import { useColors } from "@/lib/hooks/useColors";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type PaymentStatus = "unpaid" | "partial" | "paid";

type OrderItem = { quantity: number };

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
  customerId: string | null;
  items: OrderItem[];
};

type ListOrdersData = { orders: Order[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  confirmed: "#6366f1",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  unpaid: "#ef4444",
  partial: "#f59e0b",
  paid: "#10b981",
};

// ─── Filter chips ─────────────────────────────────────────────────────────────

const FILTERS: { label: string; value: OrderStatus | "all"; color: string }[] =
  [
    { label: "All", value: "all", color: "#9a9284" },
    { label: "Pending", value: "pending", color: "#f59e0b" },
    { label: "Confirmed", value: "confirmed", color: "#6366f1" },
    { label: "Shipped", value: "shipped", color: "#8b5cf6" },
    { label: "Delivered", value: "delivered", color: "#10b981" },
  ];

function FilterChip({
  label,
  active,
  color,
  onPress,
  C,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
  C: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: active ? color + "20" : C.surface,
        borderWidth: 1,
        borderColor: active ? color : C.border,
        marginRight: 8,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active ? color : C.textSecondary,
          textTransform: "capitalize",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, C }: { order: Order; C: ThemeColors }) {
  const router = useRouter();
  const statusColor = STATUS_COLORS[order.status];
  const paymentColor = PAYMENT_COLORS[order.paymentStatus];
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: "/orders/[id]", params: { id: order.id } })
      }
      activeOpacity={0.8}
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      {/* Top row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: C.textPrimary }}>
          {order.orderNumber}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}>
          {currencyFormatter.format(order.total)}
        </Text>
      </View>

      {/* Badges row */}
      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <View
          style={{
            backgroundColor: statusColor + "18",
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginRight: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: statusColor,
              textTransform: "capitalize",
            }}
          >
            {order.status}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: paymentColor + "18",
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: paymentColor,
              textTransform: "capitalize",
            }}
          >
            {order.paymentStatus}
          </Text>
        </View>
      </View>

      {/* Footer row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 12, color: C.textTertiary }}>
          {order.customerId ? "Customer assigned" : "No customer"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{ fontSize: 12, color: C.textTertiary, marginRight: 10 }}
          >
            {itemCount} unit{itemCount !== 1 ? "s" : ""}
          </Text>
          <Text
            style={{ fontSize: 12, color: C.textTertiary, marginRight: 10 }}
          >
            {formatDate(order.createdAt)}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={C.textTertiary} />
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
        <Ionicons name="receipt-outline" size={28} color={C.accent} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: 6,
        }}
      >
        No orders yet
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: C.textTertiary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        Orders will appear here once customers start placing them via WhatsApp.
      </Text>
    </View>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message, C }: { message: string; C: ThemeColors }) {
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
        Something went wrong
      </Text>
      <Text
        style={{ fontSize: 13, color: C.textTertiary, textAlign: "center" }}
      >
        {message}
      </Text>
    </View>
  );
}

// ─── Orders Screen ────────────────────────────────────────────────────────────

const LIMIT = 20;

export default function OrdersScreen() {
  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";
  const C = useColors();

  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | "all">("all");

  const { data, loading, error, refetch } = useQuery<ListOrdersData>(
    LIST_ORDERS,
    {
      variables: {
        filter: {
          ...(activeFilter !== "all" ? { status: activeFilter } : {}),
          limit: LIMIT,
          skip: 0,
        },
      },
      notifyOnNetworkStatusChange: true,
    },
  );

  const orders: Order[] = data?.orders ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !data) {
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

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <View style={{ flex: 1, backgroundColor: C.background }}>
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: C.background,
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 12,
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
            Orders
          </Text>
          {orders.length > 0 && (
            <Text
              style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}
            >
              {orders.length} order{orders.length === 1 ? "" : "s"}
            </Text>
          )}
        </View>

        {/* ── Filter chips — ScrollView avoids nested VirtualizedList warning ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={activeFilter === f.value}
              color={f.color}
              onPress={() => setActiveFilter(f.value)}
              C={C}
            />
          ))}
        </ScrollView>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error ? (
          <ErrorState message={error.message} C={C} />
        ) : (
          /* ── Orders list ────────────────────────────────────────────── */
          <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 4,
              paddingBottom: 32,
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
            renderItem={({ item }) => <OrderCard order={item} C={C} />}
          />
        )}
      </View>
    </>
  );
}

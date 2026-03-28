import { type ThemeColors } from "@/constants/Colors";
import { GET_LOW_STOCK } from "@/lib/graphql/queries/inventory.queries";
import { LIST_ORDERS } from "@/lib/graphql/queries/order.queries";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { useAuthStore } from "@/lib/store/auth.store";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
};

type ListOrdersData = { orders: Order[] };
type LowStockData = { lowStock: { productId: string }[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(isoString: string): boolean {
  const date = new Date(isoString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function getStatusColor(status: string, C: ThemeColors): string {
  switch (status.toLowerCase()) {
    case "pending":
      return C.pending;
    case "confirmed":
      return C.today;
    case "processing":
      return C.accent;
    case "shipped":
      return C.success;
    case "delivered":
      return C.success;
    case "cancelled":
      return C.alert;
    default:
      return C.textSecondary;
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type StatCardProps = {
  label: string;
  value: number | string;
  subtitle: string;
  accent: string;
  bg: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  onPress?: () => void;
  C: ThemeColors;
};

function StatCard({
  label,
  value,
  subtitle,
  accent,
  bg,
  icon,
  loading,
  onPress,
  C,
}: StatCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flex: 1,
        backgroundColor: bg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: accent + "30",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: accent + "20",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>

      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          color: loading ? C.textTertiary : accent,
          lineHeight: 32,
        }}
      >
        {loading ? "—" : String(value)}
      </Text>

      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: C.textPrimary,
          marginTop: 4,
        }}
      >
        {label}
      </Text>

      <Text
        style={{
          fontSize: 11,
          color: C.textTertiary,
          marginTop: 2,
        }}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
  onAction,
  C,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  C: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: C.textTertiary,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
      {action && onAction && (
        <Pressable onPress={onAction}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: C.accent }}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderRow({ order, C }: { order: Order; C: ThemeColors }) {
  const router = useRouter();
  const statusColor = getStatusColor(order.status, C);

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: "/orders/[id]", params: { id: order.id } })
      }
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      {/* Status dot */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: statusColor,
          marginRight: 12,
        }}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 13, fontWeight: "600", color: C.textPrimary }}
          numberOfLines={1}
        >
          {order.orderNumber}
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: statusColor,
            marginTop: 2,
            fontWeight: "500",
            textTransform: "capitalize",
          }}
        >
          {order.status}
        </Text>
      </View>

      <Text style={{ fontSize: 14, fontWeight: "700", color: C.textPrimary }}>
        {currencyFormatter.format(order.total)}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={14}
        color={C.textTertiary}
        style={{ marginLeft: 8 }}
      />
    </TouchableOpacity>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

function QuickAction({
  label,
  icon,
  onPress,
  C,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  C: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        alignItems: "center",
        backgroundColor: C.surface,
        borderRadius: 14,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          backgroundColor: C.accentMuted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons name={icon} size={20} color={C.accent} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: "600", color: C.textSecondary }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const C = useColors();
  const scheme = useScheme();

  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    data: pendingData,
    loading: pendingLoading,
    refetch: refetchPending,
  } = useQuery<ListOrdersData>(LIST_ORDERS, {
    variables: { filter: { status: "pending", limit: 100, skip: 0 } },
  });

  const {
    data: recentData,
    loading: recentLoading,
    refetch: refetchRecent,
  } = useQuery<ListOrdersData>(LIST_ORDERS, {
    variables: { filter: { limit: 20, skip: 0 } },
  });

  const {
    data: lowStockData,
    loading: lowStockLoading,
    refetch: refetchLowStock,
  } = useQuery<LowStockData>(GET_LOW_STOCK);

  const pendingCount = pendingData?.orders.length ?? 0;
  const todayCount =
    recentData?.orders.filter((o) => isToday(o.createdAt)).length ?? 0;
  const lowStockCount = lowStockData?.lowStock.length ?? 0;
  const recentOrders = recentData?.orders.slice(0, 5) ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPending(), refetchRecent(), refetchLowStock()]);
    setRefreshing(false);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.accent}
          />
        }
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: C.background,
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 20,
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 28,
                fontWeight: "800",
                color: C.textPrimary,
                letterSpacing: -0.5,
              }}
            >
              SALO
            </Text>
            <Text
              style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}
            >
              Owner Dashboard
            </Text>
          </View>

          {/* Logout — subtle icon button */}
          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed || isLoggingOut ? 0.5 : 1,
            })}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={C.textSecondary}
            />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Overview ──────────────────────────────────────────────── */}
          <SectionHeader title="Overview" C={C} />

          {/* Row 1: Pending + Today */}
          <View style={{ flexDirection: "row", marginBottom: 10 }}>
            <StatCard
              label="Pending"
              value={pendingCount}
              subtitle="Awaiting confirmation"
              accent={C.pending}
              bg={C.pendingBg}
              icon="time-outline"
              loading={pendingLoading}
              onPress={() => router.navigate("/orders")}
              C={C}
            />
            <View style={{ width: 10 }} />
            <StatCard
              label="Today"
              value={todayCount}
              subtitle="Orders placed today"
              accent={C.today}
              bg={C.todayBg}
              icon="today-outline"
              loading={recentLoading}
              onPress={() => router.navigate("/orders")}
              C={C}
            />
          </View>

          {/* Row 2: Low Stock — full width */}
          <View style={{ marginBottom: 28 }}>
            <StatCard
              label="Low Stock Alerts"
              value={lowStockCount}
              subtitle={
                lowStockCount === 0
                  ? "All variants healthy"
                  : "Variants below threshold"
              }
              accent={lowStockCount > 0 ? C.alert : C.success}
              bg={lowStockCount > 0 ? C.alertBg : C.successBg}
              icon={
                lowStockCount > 0
                  ? "warning-outline"
                  : "checkmark-circle-outline"
              }
              loading={lowStockLoading}
              onPress={() => router.navigate("/inventory")}
              C={C}
            />
          </View>

          {/* ── Quick Actions ──────────────────────────────────────────── */}
          <SectionHeader title="Quick Actions" C={C} />
          <View style={{ flexDirection: "row", marginBottom: 28 }}>
            <QuickAction
              label="Orders"
              icon="receipt-outline"
              onPress={() => router.navigate("/orders")}
              C={C}
            />
            <View style={{ width: 10 }} />
            <QuickAction
              label="Inventory"
              icon="cube-outline"
              onPress={() => router.navigate("/inventory")}
              C={C}
            />
            <View style={{ width: 10 }} />
            <QuickAction
              label="Customers"
              icon="people-outline"
              onPress={() => router.navigate("/customers")}
              C={C}
            />
          </View>

          {/* ── Recent Orders ──────────────────────────────────────────── */}
          {recentOrders.length > 0 && (
            <>
              <SectionHeader
                title="Recent Orders"
                action="View all"
                onAction={() => router.navigate("/orders")}
                C={C}
              />
              {recentOrders.map((order) => (
                <OrderRow key={order.id} order={order} C={C} />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

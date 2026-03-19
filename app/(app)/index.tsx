import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GET_LOW_STOCK } from "@/lib/graphql/queries/inventory.queries";
import { LIST_ORDERS } from "@/lib/graphql/queries/order.queries";
import { useAuthStore } from "@/lib/store/auth.store";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
};

type ListOrdersData = {
  orders: Order[];
};

type LowStockData = {
  lowStock: { productId: string }[];
};

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

// ─── Summary Card ─────────────────────────────────────────────────────────────

type SummaryCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  loading?: boolean;
};

function SummaryCard({ title, value, subtitle, loading }: SummaryCardProps) {
  return (
    <View className="mb-3">
      <Card variant="white" padding="md">
        <Text className="mb-1 text-sm font-medium text-gray-500">{title}</Text>
        <Text className="text-2xl font-bold text-gray-900">
          {loading ? "—" : String(value)}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-gray-400">{subtitle}</Text>
        ) : null}
      </Card>
    </View>
  );
}

// ─── Recent Order Row ─────────────────────────────────────────────────────────

function RecentOrderRow({ order }: { order: Order }) {
  const router = useRouter();

  return (
    <View className="mb-3">
      <Card
        variant="white"
        padding="md"
        onPress={() =>
          router.push({
            pathname: "/orders/[id]",
            params: { id: order.id },
          })
        }
      >
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 text-sm font-semibold text-gray-900 mr-3"
            numberOfLines={1}
          >
            {order.orderNumber}
          </Text>
          <Text className="text-sm font-bold text-gray-900">
            {currencyFormatter.format(order.total)}
          </Text>
        </View>
        <Text className="mt-1 text-xs capitalize text-gray-400">
          {order.status}
        </Text>
      </Card>
    </View>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Pending orders
  const {
    data: pendingData,
    loading: pendingLoading,
    refetch: refetchPending,
  } = useQuery<ListOrdersData>(LIST_ORDERS, {
    variables: { filter: { status: "pending", limit: 100, skip: 0 } },
  });

  // Recent orders (used for today's count + recent list)
  const {
    data: recentData,
    loading: recentLoading,
    refetch: refetchRecent,
  } = useQuery<ListOrdersData>(LIST_ORDERS, {
    variables: { filter: { limit: 20, skip: 0 } },
  });

  // Low stock
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

  const isLoading = pendingLoading || recentLoading || lowStockLoading;

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
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#111827"
        />
      }
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      {/* TODO: replace pt-14 with SafeAreaView when building header component. */}
      <View className="bg-white px-5 pb-5 pt-14">
        <Text className="text-2xl font-bold text-gray-900">SALO</Text>
        <Text className="mt-0.5 text-sm text-gray-500">Owner Dashboard</Text>
      </View>

      <View className="px-5 pt-5">
        {/* ── Overview ────────────────────────────────────────────────────── */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Overview
        </Text>

        <SummaryCard
          title="Pending Orders"
          value={pendingCount}
          subtitle="Awaiting confirmation"
          loading={pendingLoading}
        />
        <SummaryCard
          title="Today's Orders"
          value={todayCount}
          subtitle="Orders placed today"
          loading={recentLoading}
        />
        <SummaryCard
          title="Low Stock Alerts"
          value={lowStockCount}
          subtitle="Variants below threshold"
          loading={lowStockLoading}
        />

        {/* ── Recent Orders ────────────────────────────────────────────────── */}
        {recentOrders.length > 0 && (
          <>
            <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
              Recent Orders
            </Text>
            {recentOrders.map((order) => (
              <RecentOrderRow key={order.id} order={order} />
            ))}
            <View className="mb-3">
              <Button
                variant="ghost"
                fullWidth
                onPress={() => router.navigate("/orders")}
              >
                View all orders
              </Button>
            </View>
          </>
        )}

        {/* ── Manage ──────────────────────────────────────────────────────── */}
        <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Manage
        </Text>

        <View className="mb-3">
          <Button
            variant="primary"
            fullWidth
            onPress={() => router.navigate("/orders")}
          >
            Orders
          </Button>
        </View>
        <View className="mb-3">
          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.navigate("/inventory")}
          >
            Inventory
          </Button>
        </View>
        <View className="mb-3">
          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.navigate("/customers")}
          >
            Customers
          </Button>
        </View>

        {/* ── Logout ──────────────────────────────────────────────────────── */}
        <View className="mt-6">
          <Button
            variant="danger"
            fullWidth
            loading={isLoggingOut}
            onPress={handleLogout}
          >
            Logout
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

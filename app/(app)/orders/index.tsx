import { OrderCard } from "@/components/orders/OrderCard";
import { LIST_ORDERS } from "@/lib/graphql/queries/order.queries";
import { useQuery } from "@apollo/client/react";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
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

type OrderItem = {
  quantity: number;
};

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

type ListOrdersData = {
  orders: Order[];
};

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <Text className="mb-2 text-lg font-semibold text-gray-900">
        No orders yet
      </Text>
      <Text className="text-center text-sm text-gray-500">
        Orders will appear here once customers start placing them.
      </Text>
    </View>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <Text className="mb-2 text-lg font-semibold text-gray-900">
        Something went wrong
      </Text>
      <Text className="text-center text-sm text-gray-500">{message}</Text>
    </View>
  );
}

// ─── Orders Screen ────────────────────────────────────────────────────────────

const LIMIT = 20;

export default function OrdersScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery<ListOrdersData>(
    LIST_ORDERS,
    {
      variables: { filter: { limit: LIMIT, skip: 0 } },
      notifyOnNetworkStatusChange: true,
    },
  );

  const orders: Order[] = data?.orders ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch({ filter: { limit: LIMIT, skip: 0 } });
    setRefreshing(false);
  };

  // ── Initial loading ────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-white px-5 pb-5 pt-14">
          <Text className="text-2xl font-bold text-gray-900">Orders</Text>
        </View>
        <ErrorState message={error.message} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      {/* TODO: replace pt-14 with SafeAreaView when building header component. */}
      <View className="bg-white px-5 pb-4 pt-14">
        <Text className="text-2xl font-bold text-gray-900">Orders</Text>
        {orders.length > 0 && (
          <Text className="mt-0.5 text-sm text-gray-500">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </Text>
        )}
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 20,
          flexGrow: 1,
        }}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#111827"
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            id={item.id}
            orderNumber={item.orderNumber}
            status={item.status}
            paymentStatus={item.paymentStatus}
            total={item.total}
            createdAt={item.createdAt}
            customerId={item.customerId}
            itemCount={item.items.reduce((sum, i) => sum + i.quantity, 0)}
          />
        )}
      />
    </View>
  );
}

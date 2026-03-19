import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CANCEL_ORDER,
  UPDATE_ORDER_STATUS,
  UPDATE_PAYMENT_STATUS,
} from "@/lib/graphql/mutations/order.mutations";
import { GET_ORDER } from "@/lib/graphql/queries/order.queries";
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

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
type PaymentStatus = "unpaid" | "partial" | "paid";
type NoteKind = "internal" | "system" | "customer_message";

type OrderItem = {
  productId: string;
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type OrderNote = {
  message: string;
  kind: NoteKind;
  createdAt: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  channel: string;
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  items: OrderItem[];
  notes: OrderNote[];
};

type GetOrderData = {
  order: Order;
};

// ─── State machine ────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed"],
  confirmed: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  internal: "Internal",
  system: "System",
  customer_message: "Customer",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </Text>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  );
}

// ─── Order Detail Screen ──────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Validate id before querying — params can be undefined or arrays at runtime.
  const orderId = typeof id === "string" && id.length > 0 ? id : null;

  const { data, loading, error } = useQuery<GetOrderData>(GET_ORDER, {
    variables: { orderId },
    // Skip query entirely if id is invalid — avoids firing with bad variables.
    skip: !orderId,
  });

  // refetchQueries guarantees the screen reflects latest state after mutations.
  const refetchOrder = [{ query: GET_ORDER, variables: { orderId } }];

  const [updateStatus, { loading: updatingStatus }] = useMutation(
    UPDATE_ORDER_STATUS,
    { refetchQueries: refetchOrder },
  );
  const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER, {
    refetchQueries: refetchOrder,
  });
  const [updatePayment, { loading: updatingPayment }] = useMutation(
    UPDATE_PAYMENT_STATUS,
    { refetchQueries: refetchOrder },
  );

  const isActionLoading = updatingStatus || cancelling || updatingPayment;

  // ── Invalid id ─────────────────────────────────────────────────────────────
  if (!orderId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Invalid order
        </Text>
        <Text className="mb-6 text-center text-sm text-gray-500">
          This order ID is not valid.
        </Text>
        <Button variant="secondary" onPress={() => router.replace("/orders")}>
          Back to Orders
        </Button>
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

  // ── Network / server error ─────────────────────────────────────────────────
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Couldn't load order
        </Text>
        <Text className="mb-6 text-center text-sm text-gray-500">
          {error.message}
        </Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Go back
        </Button>
      </View>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!data?.order) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Order not found
        </Text>
        <Text className="mb-6 text-center text-sm text-gray-500">
          This order may have been deleted or does not exist.
        </Text>
        <Button variant="secondary" onPress={() => router.replace("/orders")}>
          Back to Orders
        </Button>
      </View>
    );
  }

  const order = data.order;
  const nextStatuses = VALID_TRANSITIONS[order.status];
  const canCancel =
    order.status !== "cancelled" && order.status !== "delivered";

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleUpdateStatus = (newStatus: OrderStatus) => {
    Alert.alert(
      "Update Status",
      `Change order status to "${STATUS_LABELS[newStatus]}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateStatus({
                variables: { input: { orderId, status: newStatus } },
              });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Update failed",
              );
            }
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This cannot be undone.",
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelOrder({
                variables: { input: { orderId } },
              });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Cancellation failed",
              );
            }
          },
        },
      ],
    );
  };

  const handleUpdatePayment = (newStatus: PaymentStatus) => {
    Alert.alert("Update Payment", `Mark payment as "${newStatus}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await updatePayment({
              variables: { input: { orderId, paymentStatus: newStatus } },
            });
          } catch (err) {
            Alert.alert(
              "Error",
              err instanceof Error ? err.message : "Update failed",
            );
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View className="bg-white px-5 pb-4 pt-14">
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/orders")
          }
          className="mb-3"
        >
          <Text className="text-sm font-medium text-gray-500">← Orders</Text>
        </Pressable>
        <Text className="text-2xl font-bold text-gray-900">
          {order.orderNumber}
        </Text>
        <Text className="mt-0.5 text-xs text-gray-400">
          {formatDate(order.createdAt)}
        </Text>
      </View>

      <View className="px-5 pt-5 gap-5">
        {/* ── Status ──────────────────────────────────────────────────────── */}
        <View>
          <SectionTitle>Status</SectionTitle>
          <Card variant="white" padding="md">
            <View className="flex-row gap-2 mb-3">
              <Badge status={order.status} />
              <Badge status={order.paymentStatus} />
            </View>
            <Row label="Channel" value={order.channel} />
            <Row label="Updated" value={formatDate(order.updatedAt)} />
          </Card>
        </View>

        {/* ── Customer ────────────────────────────────────────────────────── */}
        <View>
          <SectionTitle>Customer</SectionTitle>
          <Card variant="white" padding="md">
            {order.customerId ? (
              <Row label="Customer ID" value={order.customerId} />
            ) : (
              <Text className="text-sm italic text-gray-400">
                No customer assigned
              </Text>
            )}
          </Card>
        </View>

        {/* ── Items ───────────────────────────────────────────────────────── */}
        <View>
          <SectionTitle>Items</SectionTitle>
          <Card variant="white" padding="md">
            {order.items.map((item, index) => (
              <View
                key={`${item.productId}-${item.size}-${item.color}`}
                className={
                  index < order.items.length - 1
                    ? "mb-4 border-b border-gray-100 pb-4"
                    : ""
                }
              >
                <Text className="mb-1 text-sm font-semibold text-gray-900">
                  {item.productName}
                </Text>
                <Text className="mb-2 text-xs text-gray-500">
                  {item.size} · {item.color}
                </Text>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-500">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </Text>
                  <Text className="text-xs font-semibold text-gray-900">
                    {formatCurrency(item.lineTotal)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* ── Payment ─────────────────────────────────────────────────────── */}
        <View>
          <SectionTitle>Payment</SectionTitle>
          <Card variant="white" padding="md">
            <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
            <View className="mt-1 border-t border-gray-100 pt-2">
              <Row label="Total" value={formatCurrency(order.total)} />
            </View>
            <View className="mt-2">
              <Badge status={order.paymentStatus} />
            </View>
            {order.paymentStatus !== "paid" && (
              <View className="mt-4 gap-2">
                {order.paymentStatus === "unpaid" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    loading={updatingPayment}
                    onPress={() => handleUpdatePayment("partial")}
                  >
                    Mark as Partial
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  loading={updatingPayment}
                  onPress={() => handleUpdatePayment("paid")}
                >
                  Mark as Paid
                </Button>
              </View>
            )}
          </Card>
        </View>

        {/* ── Notes ───────────────────────────────────────────────────────── */}
        <View>
          <SectionTitle>Activity</SectionTitle>
          <Card variant="white" padding="md">
            {order.notes.length === 0 ? (
              <Text className="text-sm italic text-gray-400">
                No activity yet
              </Text>
            ) : (
              [...order.notes].reverse().map((note, index, arr) => (
                <View
                  // Composite key — notes have no id, createdAt+kind is stable enough.
                  key={`${note.createdAt}-${note.kind}`}
                  className={
                    index < arr.length - 1
                      ? "mb-4 border-b border-gray-100 pb-4"
                      : ""
                  }
                >
                  <View className="mb-1 flex-row items-center justify-between">
                    <Badge
                      label={NOTE_KIND_LABELS[note.kind]}
                      color={
                        note.kind === "system"
                          ? "gray"
                          : note.kind === "customer_message"
                            ? "blue"
                            : "indigo"
                      }
                    />
                    <Text className="text-xs text-gray-400">
                      {formatDate(note.createdAt)}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-700">{note.message}</Text>
                </View>
              ))
            )}
          </Card>
        </View>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        {(nextStatuses.length > 0 || canCancel) && (
          <View>
            <SectionTitle>Actions</SectionTitle>
            <View className="gap-3">
              {nextStatuses.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  variant="primary"
                  fullWidth
                  loading={isActionLoading}
                  onPress={() => handleUpdateStatus(nextStatus)}
                >
                  {`Move to ${STATUS_LABELS[nextStatus]}`}
                </Button>
              ))}
              {canCancel && (
                <Button
                  variant="danger"
                  fullWidth
                  loading={isActionLoading}
                  onPress={handleCancel}
                >
                  Cancel Order
                </Button>
              )}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

import { type ThemeColors } from "@/constants/Colors";
import {
  CANCEL_ORDER,
  DELETE_ORDER,
  UPDATE_ORDER_STATUS,
  UPDATE_PAYMENT_STATUS,
} from "@/lib/graphql/mutations/order.mutations";
import { GET_ORDER } from "@/lib/graphql/queries/order.queries";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
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
  View,
} from "react-native";

// ─── Customer query ───────────────────────────────────────────────────────────

const GET_CUSTOMER_NAME = gql`
  query GetCustomerName($id: ID!) {
    customer(id: $id) {
      id
      name
      phone
      instagramHandle
      contactChannel
    }
  }
`;

type CustomerBasic = {
  id: string;
  name: string;
  phone: string | null;
  instagramHandle: string | null;
  contactChannel: string;
};

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

type GetOrderData = { order: Order };

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

function getStatusColor(status: OrderStatus, C: ThemeColors): string {
  switch (status) {
    case "pending":
      return C.pending;
    case "confirmed":
      return C.today;
    case "processing":
      return C.today;
    case "shipped":
      return C.accent;
    case "delivered":
      return C.success;
    case "cancelled":
      return C.alert;
  }
}

function getPaymentColor(status: PaymentStatus, C: ThemeColors): string {
  switch (status) {
    case "unpaid":
      return C.alert;
    case "partial":
      return C.pending;
    case "paid":
      return C.success;
  }
}

const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  internal: "Internal",
  system: "System",
  customer_message: "Customer",
};

function getNoteKindColor(kind: NoteKind, C: ThemeColors): string {
  switch (kind) {
    case "internal":
      return C.accent;
    case "system":
      return C.accent;
    case "customer_message":
      return C.today;
  }
}

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
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  C,
}: {
  title: string;
  children: React.ReactNode;
  C: ThemeColors;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: C.textTertiary,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.border,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  last,
  C,
  mono,
}: {
  label: string;
  value: string;
  last?: boolean;
  C: ThemeColors;
  mono?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <Text style={{ fontSize: 13, color: C.textSecondary }}>{label}</Text>
      <Text
        style={{
          fontSize: mono ? 11 : 13,
          fontWeight: "600",
          color: mono ? C.textTertiary : C.textPrimary,
          fontVariant: mono ? ["tabular-nums"] : undefined,
          flexShrink: 1,
          textAlign: "right",
          marginLeft: 16,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color + "18",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color,
          textTransform: "capitalize",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionButton({
  label,
  onPress,
  loading,
  destructive,
  C,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  destructive?: boolean;
  C: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      style={{
        backgroundColor: destructive ? C.alertBg : C.accentMuted,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: destructive ? C.alert + "40" : C.accent + "40",
        opacity: loading ? 0.6 : 1,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: destructive ? C.alert : C.accent,
        }}
      >
        {loading ? "Updating…" : label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Payment Button ───────────────────────────────────────────────────────────

function PaymentButton({
  label,
  onPress,
  loading,
  C,
}: {
  label: string;
  onPress: () => void;
  loading: boolean;
  C: ThemeColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: C.border,
        opacity: loading ? 0.6 : 1,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.textPrimary }}>
        {loading ? "…" : label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Order Detail Screen ──────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const scheme = useScheme();
  const C = useColors();

  const orderId = typeof id === "string" && id.length > 0 ? id : null;

  const { data, loading, error } = useQuery<GetOrderData>(GET_ORDER, {
    variables: { orderId },
    skip: !orderId,
  });

  const refetchOrder = [{ query: GET_ORDER, variables: { orderId } }];

  const [updateStatus, { loading: updatingStatus }] = useMutation(
    UPDATE_ORDER_STATUS,
    { refetchQueries: refetchOrder },
  );
  const [cancelOrder, { loading: cancelling }] = useMutation(CANCEL_ORDER, {
    refetchQueries: refetchOrder,
  });
  const [deleteOrder, { loading: deleting }] = useMutation(DELETE_ORDER, {
    update(cache) {
      cache.evict({
        id: cache.identify({ __typename: "Order", id: orderId }),
      });
      cache.gc();
    },
    onCompleted: () => {
      Alert.alert("Deleted", "Order has been permanently deleted.", [
        { text: "OK", onPress: () => router.replace("/orders") },
      ]);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });
  const [updatePayment, { loading: updatingPayment }] = useMutation(
    UPDATE_PAYMENT_STATUS,
    { refetchQueries: refetchOrder },
  );

  const isActionLoading =
    updatingStatus || cancelling || updatingPayment || deleting;

  const { data: customerData } = useQuery<{ customer: CustomerBasic }>(
    GET_CUSTOMER_NAME,
    {
      variables: { id: data?.order?.customerId ?? "" },
      skip: !data?.order?.customerId,
    },
  );
  const customer = customerData?.customer ?? null;

  // ── Invalid id ─────────────────────────────────────────────────────────────
  if (!orderId) {
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
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: C.textPrimary,
            marginBottom: 8,
          }}
        >
          Invalid order
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/orders")}
          activeOpacity={0.7}
        >
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Orders
          </Text>
        </TouchableOpacity>
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
  if (error || !data?.order) {
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
            marginBottom: 8,
          }}
        >
          {error ? "Couldn't load order" : "Order not found"}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: C.textTertiary,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          {error?.message ?? "This order may have been deleted."}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/orders")}
          activeOpacity={0.7}
        >
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Orders
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const order = data.order;
  const nextStatuses = VALID_TRANSITIONS[order.status];
  const canCancel =
    order.status !== "cancelled" && order.status !== "delivered";
  const statusColor = getStatusColor(order.status, C);
  const paymentColor = getPaymentColor(order.paymentStatus, C);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleUpdateStatus = (newStatus: OrderStatus) => {
    Alert.alert(
      "Update Status",
      `Change order to "${STATUS_LABELS[newStatus]}"?`,
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
    Alert.alert("Cancel Order", "Are you sure? This cannot be undone.", [
      { text: "Keep Order", style: "cancel" },
      {
        text: "Cancel Order",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelOrder({ variables: { input: { orderId } } });
          } catch (err) {
            Alert.alert(
              "Error",
              err instanceof Error ? err.message : "Cancellation failed",
            );
          }
        },
      },
    ]);
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

  const handleDelete = () => {
    Alert.alert(
      "Delete Order",
      `Permanently delete ${order.orderNumber}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteOrder({ variables: { input: { orderId } } });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Delete failed",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
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
              router.canGoBack() ? router.back() : router.replace("/orders")
            }
            activeOpacity={0.6}
            style={{
              alignSelf: "flex-start",
              marginBottom: 32,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="arrow-back" size={16} color={C.accent} />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: C.accent,
                marginLeft: 4,
              }}
            >
              Orders
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: C.textPrimary,
                  letterSpacing: -0.5,
                }}
              >
                {order.orderNumber}
              </Text>
              <Text
                style={{ fontSize: 12, color: C.textTertiary, marginTop: 3 }}
              >
                {formatDate(order.createdAt)}
              </Text>
            </View>
            <Text
              style={{ fontSize: 22, fontWeight: "800", color: C.textPrimary }}
            >
              {currencyFormatter.format(order.total)}
            </Text>
          </View>

          {/* Status badges */}
          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <View style={{ marginRight: 8 }}>
              <StatusBadge label={order.status} color={statusColor} />
            </View>
            <StatusBadge label={order.paymentStatus} color={paymentColor} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Customer ────────────────────────────────────────────── */}
          <Section title="Customer" C={C}>
            {customer ? (
              <>
                <InfoRow label="Name" value={customer.name} C={C} />
                {customer.phone && (
                  <InfoRow
                    label="Phone"
                    value={customer.phone}
                    C={C}
                    last={!customer.instagramHandle}
                  />
                )}
                {customer.instagramHandle && (
                  <InfoRow
                    label="Instagram"
                    value={`@${customer.instagramHandle}`}
                    C={C}
                    last
                  />
                )}
              </>
            ) : order.customerId ? (
              <InfoRow
                label="Customer ID"
                value={order.customerId}
                C={C}
                last
              />
            ) : (
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: C.textTertiary,
                    fontStyle: "italic",
                  }}
                >
                  No customer assigned
                </Text>
              </View>
            )}
          </Section>

          {/* ── Items ───────────────────────────────────────────────── */}
          <Section title="Items" C={C}>
            {order.items.map((item, index) => (
              <View
                key={`${item.productId}-${item.size}-${item.color}`}
                style={{
                  padding: 16,
                  borderBottomWidth: index < order.items.length - 1 ? 1 : 0,
                  borderBottomColor: C.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: C.textPrimary,
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    {item.productName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: C.textPrimary,
                    }}
                  >
                    {currencyFormatter.format(item.lineTotal)}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 12, color: C.textTertiary }}>
                    {item.size} · {item.color}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textTertiary }}>
                    {item.quantity} × {currencyFormatter.format(item.unitPrice)}
                  </Text>
                </View>
              </View>
            ))}
          </Section>

          {/* ── Payment ─────────────────────────────────────────────── */}
          <Section title="Payment" C={C}>
            <InfoRow
              label="Subtotal"
              value={currencyFormatter.format(order.subtotal)}
              C={C}
            />
            <InfoRow
              label="Total"
              value={currencyFormatter.format(order.total)}
              C={C}
              last
            />
          </Section>

          {/* ── Order Info ──────────────────────────────────────────── */}
          <Section title="Order Info" C={C}>
            <InfoRow label="Channel" value={order.channel} C={C} />
            <InfoRow
              label="Updated"
              value={formatDate(order.updatedAt)}
              C={C}
            />
            <InfoRow label="System ID" value={order.id} C={C} last mono />
          </Section>

          {/* ── Activity ────────────────────────────────────────────── */}
          <Section title="Activity" C={C}>
            {order.notes.length === 0 ? (
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: C.textTertiary,
                    fontStyle: "italic",
                  }}
                >
                  No activity yet
                </Text>
              </View>
            ) : (
              [...order.notes].reverse().map((note, index, arr) => {
                const noteColor = getNoteKindColor(note.kind, C);
                return (
                  <View
                    key={`${note.createdAt}-${note.kind}-${index}`}
                    style={{
                      padding: 16,
                      borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                      borderBottomColor: C.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: noteColor + "18",
                          borderRadius: 5,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: noteColor,
                          }}
                        >
                          {NOTE_KIND_LABELS[note.kind]}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: C.textTertiary }}>
                        {formatDate(note.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: C.textSecondary,
                        lineHeight: 18,
                      }}
                    >
                      {note.message}
                    </Text>
                  </View>
                );
              })
            )}
          </Section>

          {/* ── Actions ─────────────────────────────────────────────── */}
          <View style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: C.textTertiary,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Actions
            </Text>

            {/* Status progression buttons */}
            {nextStatuses.map((nextStatus) => (
              <ActionButton
                key={nextStatus}
                label={`Move to ${STATUS_LABELS[nextStatus]}`}
                onPress={() => handleUpdateStatus(nextStatus)}
                loading={isActionLoading}
                C={C}
              />
            ))}

            {/* Mark as Paid + Cancel Order side by side */}
            {((order.paymentStatus !== "paid" &&
              order.status !== "cancelled") ||
              canCancel) && (
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {order.paymentStatus !== "paid" &&
                  order.status !== "cancelled" && (
                    <>
                      <PaymentButton
                        label="Mark Paid"
                        onPress={() => handleUpdatePayment("paid")}
                        loading={updatingPayment}
                        C={C}
                      />
                      <View style={{ width: 8 }} />
                    </>
                  )}
                {canCancel && (
                  <PaymentButton
                    label="Cancel Order"
                    onPress={handleCancel}
                    loading={isActionLoading}
                    C={C}
                  />
                )}
              </View>
            )}

            {/* Delete Order — always visible, full width */}
            <ActionButton
              label="Delete Order"
              onPress={handleDelete}
              loading={deleting}
              destructive
              C={C}
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
}

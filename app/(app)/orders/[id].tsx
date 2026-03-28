import { type ThemeColors } from "@/constants/Colors";
import {
  CANCEL_ORDER,
  UPDATE_ORDER_STATUS,
  UPDATE_PAYMENT_STATUS,
} from "@/lib/graphql/mutations/order.mutations";
import { GET_ORDER } from "@/lib/graphql/queries/order.queries";
import { useColors } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useColorScheme,
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

const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  internal: "Internal",
  system: "System",
  customer_message: "Customer",
};

const NOTE_KIND_COLORS: Record<NoteKind, string> = {
  internal: "#6366f1",
  system: "#9a9284",
  customer_message: "#3b82f6",
};

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
}: {
  label: string;
  value: string;
  last?: boolean;
  C: ThemeColors;
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
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.textPrimary }}>
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
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        backgroundColor: destructive ? C.alertBg : C.accentMuted,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: destructive ? C.alert + "40" : C.accent + "40",
        opacity: pressed || loading ? 0.6 : 1,
        marginBottom: 8,
      })}
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
    </Pressable>
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
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: C.border,
        opacity: pressed || loading ? 0.6 : 1,
      })}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: C.textPrimary }}>
        {loading ? "…" : label}
      </Text>
    </Pressable>
  );
}

// ─── Order Detail Screen ──────────────────────────────────────────────────────

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";
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
  const [updatePayment, { loading: updatingPayment }] = useMutation(
    UPDATE_PAYMENT_STATUS,
    { refetchQueries: refetchOrder },
  );

  const isActionLoading = updatingStatus || cancelling || updatingPayment;

  // Customer query — must be at top level (hooks rule), skip when no customerId
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
        <Pressable onPress={() => router.replace("/orders")}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Orders
          </Text>
        </Pressable>
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
        <Pressable onPress={() => router.replace("/orders")}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Orders
          </Text>
        </Pressable>
      </View>
    );
  }

  const order = data.order;
  const nextStatuses = VALID_TRANSITIONS[order.status];
  const canCancel =
    order.status !== "cancelled" && order.status !== "delivered";
  const statusColor = STATUS_COLORS[order.status];
  const paymentColor = PAYMENT_COLORS[order.paymentStatus];

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

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
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
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <StatusBadge label={order.status} color={statusColor} />
            <StatusBadge label={order.paymentStatus} color={paymentColor} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Order info ──────────────────────────────────────────── */}
          <Section title="Order Info" C={C}>
            <InfoRow label="Channel" value={order.channel} C={C} />
            <InfoRow
              label="Updated"
              value={formatDate(order.updatedAt)}
              C={C}
              last
            />
          </Section>

          {/* ── Customer ────────────────────────────────────────────── */}
          <Section title="Customer" C={C}>
            {customer ? (
              <>
                <InfoRow label="Name" value={customer.name} C={C} />
                {customer.phone && (
                  <InfoRow label="Phone" value={customer.phone} C={C} />
                )}
                {customer.instagramHandle && (
                  <InfoRow
                    label="Instagram"
                    value={`@${customer.instagramHandle}`}
                    C={C}
                  />
                )}
                <InfoRow
                  label="Channel"
                  value={customer.contactChannel}
                  C={C}
                  last
                />
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

            {order.paymentStatus !== "paid" && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  padding: 16,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                }}
              >
                {order.paymentStatus === "unpaid" && (
                  <PaymentButton
                    label="Mark as Partial"
                    onPress={() => handleUpdatePayment("partial")}
                    loading={updatingPayment}
                    C={C}
                  />
                )}
                <PaymentButton
                  label="Mark as Paid"
                  onPress={() => handleUpdatePayment("paid")}
                  loading={updatingPayment}
                  C={C}
                />
              </View>
            )}
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
                const noteColor = NOTE_KIND_COLORS[note.kind];
                return (
                  <View
                    key={`${note.createdAt}-${note.kind}`}
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
          {(nextStatuses.length > 0 || canCancel) && (
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

              {nextStatuses.map((nextStatus) => (
                <ActionButton
                  key={nextStatus}
                  label={`Move to ${STATUS_LABELS[nextStatus]}`}
                  onPress={() => handleUpdateStatus(nextStatus)}
                  loading={isActionLoading}
                  C={C}
                />
              ))}

              {canCancel && (
                <ActionButton
                  label="Cancel Order"
                  onPress={handleCancel}
                  loading={isActionLoading}
                  destructive
                  C={C}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

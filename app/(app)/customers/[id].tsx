import type { ThemeColors } from "@/constants/Colors";
import {
  DEACTIVATE_CUSTOMER,
  UPDATE_CUSTOMER,
} from "@/lib/graphql/mutations/customer.mutations";
import {
  GET_CUSTOMER,
  LIST_CUSTOMERS,
} from "@/lib/graphql/queries/customer.queries";
import { LIST_ORDERS } from "@/lib/graphql/queries/order.queries";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type ContactChannel = "whatsapp" | "instagram" | "both";
type CustomerTag = "vip" | "wholesale" | "problematic" | "regular";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  instagramHandle: string | null;
  contactChannel: ContactChannel;
  notes: string | null;
  tags: CustomerTag[];
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type GetCustomerData = { customer: Customer };

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
type PaymentStatus = "unpaid" | "partial" | "paid";

type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
  customerId: string | null;
  items: { quantity: number }[];
};

type ListOrdersData = { orders: Order[] };

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

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "both", label: "Both" },
];

const ALL_TAGS: { value: CustomerTag; label: string }[] = [
  { value: "vip", label: "VIP" },
  { value: "wholesale", label: "Wholesale" },
  { value: "problematic", label: "Problematic" },
  { value: "regular", label: "Regular" },
];

// ─── Style helpers ────────────────────────────────────────────────────────────

function getChannelColor(channel: ContactChannel, C: ThemeColors): string {
  switch (channel) {
    case "whatsapp":
      return C.success;
    case "instagram":
      return C.accent; // no purple token; accent as stand-in
    case "both":
      return C.today;
  }
}

function getTagColor(tag: CustomerTag, C: ThemeColors): string {
  switch (tag) {
    case "vip":
      return C.pending;
    case "wholesale":
      return C.today;
    case "problematic":
      return C.alert;
    case "regular":
      return C.textSecondary;
  }
}

const CHANNEL_LABELS: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  both: "Both",
};

const TAG_LABELS: Record<CustomerTag, string> = {
  vip: "VIP",
  wholesale: "Wholesale",
  problematic: "Problematic",
  regular: "Regular",
};

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length > 0 && !cleaned.startsWith("+")) {
    return `+52${cleaned}`;
  }
  return cleaned;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Pill badge ───────────────────────────────────────────────────────────────

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: color + "18",
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
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
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: C.textPrimary,
          flex: 1,
          textAlign: "right",
          marginLeft: 16,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Edit Field ───────────────────────────────────────────────────────────────

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad";
  C: ThemeColors;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1,
          color: C.textTertiary,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={keyboardType === "phone-pad" ? "none" : "words"}
        autoCorrect={false}
        multiline={multiline}
        style={{
          backgroundColor: C.background,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 10,
          paddingVertical: 11,
          paddingHorizontal: 14,
          fontSize: 14,
          color: C.textPrimary,
          textAlignVertical: multiline ? "top" : "center",
          minHeight: multiline ? 80 : undefined,
        }}
      />
    </View>
  );
}

// ─── Customer Detail Screen ───────────────────────────────────────────────────

const LIST_LIMIT = 100;

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const customerId = typeof id === "string" && id.length > 0 ? id : null;

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editInstagram, setEditInstagram] = useState("");
  const [editChannel, setEditChannel] = useState<ContactChannel>("whatsapp");
  const [editTags, setEditTags] = useState<CustomerTag[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const { data: ordersData } = useQuery<ListOrdersData>(LIST_ORDERS, {
    variables: { filter: { customerId: customerId, limit: 50, skip: 0 } },
    skip: !customerId,
  });

  const customerOrders = ordersData?.orders ?? [];

  const { data, loading, error } = useQuery<GetCustomerData>(GET_CUSTOMER, {
    variables: { id: customerId },
    skip: !customerId,
  });

  const [updateCustomer, { loading: updating }] = useMutation(UPDATE_CUSTOMER, {
    refetchQueries: [{ query: GET_CUSTOMER, variables: { id: customerId } }],
    onCompleted: () => {
      setEditVisible(false);
      Alert.alert("Updated", "Customer updated.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const [deactivateCustomer, { loading: deactivating }] = useMutation(
    DEACTIVATE_CUSTOMER,
    {
      refetchQueries: [
        {
          query: LIST_CUSTOMERS,
          variables: { input: { limit: LIST_LIMIT, isActive: true } },
        },
      ],
      onCompleted: () => {
        Alert.alert("Deleted", "Customer has been removed.", [
          { text: "OK", onPress: () => router.replace("/customers") },
        ]);
      },
      onError: (err) => Alert.alert("Error", err.message),
    },
  );

  const openEdit = () => {
    if (!data?.customer) return;
    const c = data.customer;
    setEditName(c.name);
    setEditPhone(c.phone ?? "");
    setEditInstagram(c.instagramHandle ?? "");
    setEditChannel(c.contactChannel);
    setEditTags([...c.tags]);
    setEditNotes(c.notes ?? "");
    setEditAddress(c.address ?? "");
    setEditVisible(true);
  };

  const toggleEditTag = (tag: CustomerTag) => {
    if (editTags.includes(tag)) {
      setEditTags(editTags.filter((t) => t !== tag));
    } else {
      setEditTags([...editTags, tag]);
    }
  };

  const handleUpdate = () => {
    if (!customerId) return;
    if (!editName.trim()) return Alert.alert("Required", "Name is required.");

    updateCustomer({
      variables: {
        id: customerId,
        input: {
          name: editName.trim(),
          phone: editPhone.trim()
            ? normalizePhone(editPhone.trim())
            : undefined,
          instagramHandle: editInstagram.trim() || undefined,
          contactChannel: editChannel,
          tags: editTags,
          notes: editNotes.trim() || undefined,
          address: editAddress.trim() || undefined,
        },
      },
    });
  };

  const handleDelete = () => {
    if (!customerId) return;
    Alert.alert(
      "Delete Customer",
      `Remove "${data?.customer?.name}"? They will no longer appear in your customer list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deactivateCustomer({ variables: { id: customerId } }),
        },
      ],
    );
  };

  // ── Invalid id ─────────────────────────────────────────────────────────────
  if (!customerId) {
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
            marginBottom: 24,
          }}
        >
          Invalid customer
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/customers")}
          activeOpacity={0.7}
        >
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Customers
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

  // ── Error / not found ──────────────────────────────────────────────────────
  if (error || !data?.customer) {
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
          {error ? "Couldn't load customer" : "Customer not found"}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: C.textTertiary,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          {error?.message ?? "This customer may no longer exist."}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/customers")}
          activeOpacity={0.7}
        >
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Customers
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customer = data.customer;
  const channelColor = getChannelColor(customer.contactChannel, C);

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
          style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 }}
        >
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/customers")
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
              Customers
            </Text>
          </TouchableOpacity>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 22,
                fontWeight: "800",
                color: C.textPrimary,
                letterSpacing: -0.5,
                marginRight: 12,
              }}
              numberOfLines={1}
            >
              {customer.name}
            </Text>
            {!customer.isActive && (
              <View
                style={{
                  backgroundColor: C.border,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: C.textTertiary,
                  }}
                >
                  Inactive
                </Text>
              </View>
            )}
          </View>

          {/* Channel badge */}
          <View style={{ marginTop: 8 }}>
            <Pill
              label={CHANNEL_LABELS[customer.contactChannel]}
              color={channelColor}
            />
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <TouchableOpacity
              onPress={openEdit}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.accentMuted,
                borderRadius: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: C.accent + "40",
                marginRight: 10,
              }}
            >
              <Ionicons
                name="pencil-outline"
                size={16}
                color={C.accent}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: C.accent }}
              >
                Edit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deactivating}
              activeOpacity={0.8}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: C.alertBg,
                borderRadius: 12,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: C.alert + "40",
              }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={C.alert}
                style={{ marginRight: 6 }}
              />
              <Text style={{ fontSize: 14, fontWeight: "600", color: C.alert }}>
                {deactivating ? "Deleting…" : "Delete"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Contact ─────────────────────────────────────────────── */}
          <Section title="Contact" C={C}>
            {customer.phone && (
              <InfoRow
                label="Phone"
                value={customer.phone}
                C={C}
                last={!customer.instagramHandle && !customer.address}
              />
            )}
            {customer.instagramHandle && (
              <InfoRow
                label="Instagram"
                value={`@${customer.instagramHandle}`}
                C={C}
                last={!customer.address}
              />
            )}
            {customer.address && (
              <InfoRow label="Address" value={customer.address} C={C} last />
            )}
            {!customer.phone &&
              !customer.instagramHandle &&
              !customer.address && (
                <View style={{ padding: 16 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textTertiary,
                      fontStyle: "italic",
                    }}
                  >
                    No contact details
                  </Text>
                </View>
              )}
          </Section>

          {/* ── Orders ──────────────────────────────────────────────── */}
          <Section title={`Orders (${customerOrders.length})`} C={C}>
            {customerOrders.length === 0 ? (
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: C.textTertiary,
                    fontStyle: "italic",
                  }}
                >
                  No orders yet
                </Text>
              </View>
            ) : (
              customerOrders.map((order, i) => {
                const statusColor = getStatusColor(order.status, C);
                const paymentColor = getPaymentColor(order.paymentStatus, C);
                const itemCount = order.items.reduce(
                  (sum, it) => sum + it.quantity,
                  0,
                );
                return (
                  <TouchableOpacity
                    key={order.id}
                    onPress={() =>
                      router.push({
                        pathname: "/orders/[id]",
                        params: { id: order.id },
                      })
                    }
                    activeOpacity={0.8}
                    style={{
                      padding: 14,
                      borderBottomWidth: i < customerOrders.length - 1 ? 1 : 0,
                      borderBottomColor: C.border,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: C.textPrimary,
                        }}
                      >
                        {order.orderNumber}
                      </Text>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: C.textPrimary,
                        }}
                      >
                        {currencyFormatter.format(order.total)}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row" }}>
                        <View
                          style={{
                            backgroundColor: statusColor + "18",
                            borderRadius: 5,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                            marginRight: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
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
                            borderRadius: 5,
                            paddingHorizontal: 7,
                            paddingVertical: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: paymentColor,
                              textTransform: "capitalize",
                            }}
                          >
                            {order.paymentStatus}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: C.textTertiary }}>
                        {itemCount} unit{itemCount !== 1 ? "s" : ""} ·{" "}
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Section>

          {/* ── Tags ────────────────────────────────────────────────── */}
          {customer.tags.length > 0 && (
            <Section title="Tags" C={C}>
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", padding: 16 }}
              >
                {customer.tags.map((tag) => (
                  <View key={tag} style={{ marginRight: 8, marginBottom: 6 }}>
                    <Pill label={TAG_LABELS[tag]} color={getTagColor(tag, C)} />
                  </View>
                ))}
              </View>
            </Section>
          )}

          {/* ── Notes ───────────────────────────────────────────────── */}
          {customer.notes && (
            <Section title="Notes" C={C}>
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: C.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  {customer.notes}
                </Text>
              </View>
            </Section>
          )}

          {/* ── Info ────────────────────────────────────────────────── */}
          <Section title="Info" C={C}>
            <InfoRow
              label="Created"
              value={formatDate(customer.createdAt)}
              C={C}
            />
            <InfoRow
              label="Updated"
              value={formatDate(customer.updatedAt)}
              C={C}
            />
            <InfoRow
              label="Status"
              value={customer.isActive ? "Active" : "Inactive"}
              C={C}
              last
            />
          </Section>
        </View>
      </ScrollView>

      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={editVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: C.background }}>
          {/* Modal header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setEditVisible(false)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: C.textSecondary,
                  fontWeight: "500",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}
            >
              Edit Customer
            </Text>
            <TouchableOpacity
              onPress={handleUpdate}
              disabled={updating}
              activeOpacity={0.7}
            >
              {updating ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Text
                  style={{ fontSize: 15, color: C.accent, fontWeight: "700" }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          >
            <EditField
              label="Name"
              value={editName}
              onChangeText={setEditName}
              C={C}
            />
            <EditField
              label="Phone"
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+521234567890"
              keyboardType="phone-pad"
              C={C}
            />
            <EditField
              label="Instagram"
              value={editInstagram}
              onChangeText={setEditInstagram}
              placeholder="handle"
              C={C}
            />

            {/* Tags */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: C.textTertiary,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Tags
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {ALL_TAGS.map((tag) => {
                  const selected = editTags.includes(tag.value);
                  const tagColor = getTagColor(tag.value, C);
                  return (
                    <TouchableOpacity
                      key={tag.value}
                      onPress={() => toggleEditTag(tag.value)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: selected ? tagColor + "20" : C.surface,
                        borderWidth: 1,
                        borderColor: selected ? tagColor : C.border,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: selected ? tagColor : C.textSecondary,
                        }}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <EditField
              label="Address"
              value={editAddress}
              onChangeText={setEditAddress}
              placeholder="Optional"
              C={C}
            />
            <EditField
              label="Notes"
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Optional"
              multiline
              C={C}
            />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

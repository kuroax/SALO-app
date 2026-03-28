import type { ThemeColors } from "@/constants/Colors";
import { GET_CUSTOMER } from "@/lib/graphql/queries/customer.queries";
import { useColors } from "@/lib/hooks/useColors";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  useColorScheme,
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

// ─── Style maps ───────────────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<ContactChannel, string> = {
  whatsapp: "#22c55e",
  instagram: "#a855f7",
  both: "#3b82f6",
};

const CHANNEL_LABELS: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  both: "Both",
};

const TAG_COLORS: Record<CustomerTag, string> = {
  vip: "#f59e0b",
  wholesale: "#6366f1",
  problematic: "#ef4444",
  regular: "#9a9284",
};

const TAG_LABELS: Record<CustomerTag, string> = {
  vip: "VIP",
  wholesale: "Wholesale",
  problematic: "Problematic",
  regular: "Regular",
};

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

// ─── Customer Detail Screen ───────────────────────────────────────────────────

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const C = useColors();
  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";

  const customerId = typeof id === "string" && id.length > 0 ? id : null;

  const { data, loading, error } = useQuery<GetCustomerData>(GET_CUSTOMER, {
    variables: { id: customerId },
    skip: !customerId,
  });

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
        <Pressable onPress={() => router.replace("/customers")}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Customers
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
        <Pressable onPress={() => router.replace("/customers")}>
          <Text style={{ color: C.accent, fontWeight: "600" }}>
            Back to Customers
          </Text>
        </Pressable>
      </View>
    );
  }

  const customer = data.customer;
  const channelColor = CHANNEL_COLORS[customer.contactChannel];

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
                Customers
              </Text>
            </View>
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

          {/* Channel badge under name */}
          <View style={{ marginTop: 8 }}>
            <Pill
              label={CHANNEL_LABELS[customer.contactChannel]}
              color={channelColor}
            />
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

          {/* ── Tags ────────────────────────────────────────────────── */}
          {customer.tags.length > 0 && (
            <Section title="Tags" C={C}>
              <View
                style={{ flexDirection: "row", flexWrap: "wrap", padding: 16 }}
              >
                {customer.tags.map((tag) => (
                  <View key={tag} style={{ marginRight: 8, marginBottom: 6 }}>
                    <Pill label={TAG_LABELS[tag]} color={TAG_COLORS[tag]} />
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
    </>
  );
}

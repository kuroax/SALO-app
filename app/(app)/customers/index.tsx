import type { ThemeColors } from "@/constants/Colors";
import { LIST_CUSTOMERS } from "@/lib/graphql/queries/customer.queries";
import { useColors } from "@/lib/hooks/useColors";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
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
  tags: CustomerTag[];
  isActive: boolean;
};

type ListCustomersData = {
  customers: {
    customers: Customer[];
    total: number;
  };
};

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

const CHANNEL_ICONS: Record<
  ContactChannel,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  whatsapp: "logo-whatsapp",
  instagram: "logo-instagram",
  both: "globe-outline",
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

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: color + "25",
        borderWidth: 1,
        borderColor: color + "50",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

// ─── Customer Row ─────────────────────────────────────────────────────────────

function CustomerRow({
  customer,
  onPress,
  isLast,
  C,
}: {
  customer: Customer;
  onPress: () => void;
  isLast: boolean;
  C: ThemeColors;
}) {
  const channelColor = CHANNEL_COLORS[customer.contactChannel];
  const contact =
    customer.phone ??
    (customer.instagramHandle ? `@${customer.instagramHandle}` : null);
  const channelIcon = CHANNEL_ICONS[customer.contactChannel];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
        backgroundColor: pressed ? C.surface : "transparent",
      })}
    >
      {/* Avatar */}
      <Avatar name={customer.name} color={channelColor} />

      {/* Info */}
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}
          numberOfLines={1}
        >
          {customer.name}
        </Text>

        {/* Contact line with channel icon */}
        {contact && (
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}
          >
            <Ionicons
              name={channelIcon}
              size={12}
              color={C.textTertiary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{ fontSize: 12, color: C.textSecondary }}
              numberOfLines={1}
            >
              {contact}
            </Text>
          </View>
        )}

        {/* Tags */}
        {customer.tags.length > 0 && (
          <View style={{ flexDirection: "row", marginTop: 5 }}>
            {customer.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: TAG_COLORS[tag] + "20",
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginRight: 5,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: TAG_COLORS[tag],
                  }}
                >
                  {TAG_LABELS[tag]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
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
        <Ionicons name="people-outline" size={28} color={C.accent} />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: 6,
        }}
      >
        No customers yet
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: C.textTertiary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        Customers will appear here once they interact via WhatsApp or Instagram.
      </Text>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionDivider({ letter, C }: { letter: string; C: ThemeColors }) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 6,
        backgroundColor: C.background,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: C.accent,
          letterSpacing: 1,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

// ─── Customers Screen ─────────────────────────────────────────────────────────

const LIMIT = 100;

export default function CustomersScreen() {
  const router = useRouter();
  const C = useColors();
  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";

  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useQuery<ListCustomersData>(
    LIST_CUSTOMERS,
    {
      variables: { input: { limit: LIMIT, isActive: true } },
      notifyOnNetworkStatusChange: true,
    },
  );

  const customers = data?.customers.customers ?? [];

  // Group alphabetically
  const grouped = customers
    .reduce<{ letter: string; items: Customer[] }[]>((acc, customer) => {
      const letter = customer.name[0]?.toUpperCase() ?? "#";
      const existing = acc.find((g) => g.letter === letter);
      if (existing) {
        existing.items.push(customer);
      } else {
        acc.push({ letter, items: [customer] });
      }
      return acc;
    }, [])
    .sort((a, b) => a.letter.localeCompare(b.letter));

  type ListItem =
    | { type: "header"; letter: string; key: string }
    | { type: "customer"; customer: Customer; isLast: boolean; key: string };

  const listData: ListItem[] = grouped.flatMap((group) => [
    {
      type: "header" as const,
      letter: group.letter,
      key: `header-${group.letter}`,
    },
    ...group.items.map((customer, i) => ({
      type: "customer" as const,
      customer,
      isLast: i === group.items.length - 1,
      key: customer.id,
    })),
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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
          Couldn't load customers
        </Text>
        <Text
          style={{ fontSize: 13, color: C.textTertiary, textAlign: "center" }}
        >
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <View style={{ flex: 1, backgroundColor: C.background }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 16,
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
            Customers
          </Text>
          {customers.length > 0 && (
            <Text
              style={{
                fontSize: 13,
                color: C.accent,
                marginTop: 2,
                fontWeight: "600",
              }}
            >
              {data?.customers.total} total
            </Text>
          )}
        </View>

        <View style={{ height: 1, backgroundColor: C.border }} />

        {/* ── List ────────────────────────────────────────────────────── */}
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState C={C} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.accent}
            />
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return <SectionDivider letter={item.letter} C={C} />;
            }
            return (
              <CustomerRow
                customer={item.customer}
                onPress={() =>
                  router.push({
                    pathname: "/customers/[id]",
                    params: { id: item.customer.id },
                  })
                }
                isLast={item.isLast}
                C={C}
              />
            );
          }}
        />
      </View>
    </>
  );
}

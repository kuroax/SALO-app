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

// ─── Inline badge ─────────────────────────────────────────────────────────────

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

// ─── Customer Card ────────────────────────────────────────────────────────────

function CustomerCard({
  customer,
  onPress,
  C,
}: {
  customer: Customer;
  onPress: () => void;
  C: ThemeColors;
}) {
  const contact =
    customer.phone ??
    (customer.instagramHandle ? `@${customer.instagramHandle}` : null);
  const channelColor = CHANNEL_COLORS[customer.contactChannel];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {/* Top row: name + channel badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: "700",
            color: C.textPrimary,
            marginRight: 12,
          }}
          numberOfLines={1}
        >
          {customer.name}
        </Text>
        <Pill
          label={CHANNEL_LABELS[customer.contactChannel]}
          color={channelColor}
        />
      </View>

      {/* Contact handle */}
      {contact && (
        <Text
          style={{
            fontSize: 12,
            color: C.textSecondary,
            marginBottom: customer.tags.length > 0 ? 10 : 0,
          }}
          numberOfLines={1}
        >
          {contact}
        </Text>
      )}

      {/* Tags */}
      {customer.tags.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {customer.tags.map((tag) => (
            <View key={tag} style={{ marginRight: 6, marginBottom: 4 }}>
              <Pill label={TAG_LABELS[tag]} color={TAG_COLORS[tag]} />
            </View>
          ))}
        </View>
      )}
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

// ─── Customers Screen ─────────────────────────────────────────────────────────

const LIMIT = 30;

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
            backgroundColor: C.background,
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
              style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}
            >
              {data?.customers.total} total
            </Text>
          )}
        </View>

        {/* ── List ────────────────────────────────────────────────────── */}
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 100,
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
          renderItem={({ item }) => (
            <CustomerCard
              customer={item}
              onPress={() =>
                router.push({
                  pathname: "/customers/[id]",
                  params: { id: item.id },
                })
              }
              C={C}
            />
          )}
        />
      </View>
    </>
  );
}

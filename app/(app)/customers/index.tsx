import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LIST_CUSTOMERS } from "@/lib/graphql/queries/customer.queries";
import { useQuery } from "@apollo/client/react";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
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

const channelColors: Record<ContactChannel, "green" | "purple" | "blue"> = {
  whatsapp: "green",
  instagram: "purple",
  both: "blue",
};

const channelLabels: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  both: "Both",
};

const tagColors: Record<CustomerTag, "amber" | "indigo" | "red" | "gray"> = {
  vip: "amber",
  wholesale: "indigo",
  problematic: "red",
  regular: "gray",
};

const tagLabels: Record<CustomerTag, string> = {
  vip: "VIP",
  wholesale: "Wholesale",
  problematic: "Problematic",
  regular: "Regular",
};

// ─── Customer Card ────────────────────────────────────────────────────────────

type CustomerCardProps = {
  customer: Customer;
  onPress: () => void;
};

function CustomerCard({ customer, onPress }: CustomerCardProps) {
  const contact = customer.phone ?? customer.instagramHandle ?? "—";

  return (
    <View className="mb-3">
      <Card variant="white" padding="md" onPress={onPress}>
        {/* ── Top row: name + channel ───────────────────────────────────── */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text
            className="flex-1 text-sm font-bold text-gray-900 mr-3"
            numberOfLines={1}
          >
            {customer.name}
          </Text>
          <Badge
            label={channelLabels[customer.contactChannel]}
            color={channelColors[customer.contactChannel]}
          />
        </View>

        {/* ── Contact handle ────────────────────────────────────────────── */}
        <Text className="mb-2 text-xs text-gray-500" numberOfLines={1}>
          {contact}
        </Text>

        {/* ── Tags ─────────────────────────────────────────────────────── */}
        {customer.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <Badge key={tag} label={tagLabels[tag]} color={tagColors[tag]} />
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}

// ─── Customers Screen ─────────────────────────────────────────────────────────

const LIMIT = 30;

export default function CustomersScreen() {
  const router = useRouter();
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
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-2 text-lg font-semibold text-gray-900">
          Couldn't load customers
        </Text>
        <Text className="text-center text-sm text-gray-500">
          {error.message}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View className="bg-white px-5 pb-4 pt-14">
        <Text className="text-2xl font-bold text-gray-900">Customers</Text>
        {customers.length > 0 && (
          <Text className="mt-0.5 text-sm text-gray-500">
            {data?.customers.total} total
          </Text>
        )}
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="mb-2 text-lg font-semibold text-gray-900">
              No customers yet
            </Text>
            <Text className="text-center text-sm text-gray-500">
              Customers will appear here once they interact via WhatsApp or
              Instagram.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#111827"
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
          />
        )}
      />
    </View>
  );
}

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GET_CUSTOMER } from "@/lib/graphql/queries/customer.queries";
import { useQuery } from "@apollo/client/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
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
  notes: string | null;
  tags: CustomerTag[];
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type GetCustomerData = {
  customer: Customer;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
    <View className="flex-row items-start justify-between py-1.5">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm font-medium text-gray-900">
        {value}
      </Text>
    </View>
  );
}

// ─── Customer Detail Screen ───────────────────────────────────────────────────

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const customerId = typeof id === "string" && id.length > 0 ? id : null;

  const { data, loading, error } = useQuery<GetCustomerData>(GET_CUSTOMER, {
    variables: { id: customerId },
    skip: !customerId,
  });

  if (!customerId) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-6 text-lg font-semibold text-gray-900">
          Invalid customer
        </Text>
        <Button
          variant="secondary"
          onPress={() => router.replace("/customers")}
        >
          Back to Customers
        </Button>
      </View>
    );
  }

  if (loading) {
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
          Couldn't load customer
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

  if (!data?.customer) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <Text className="mb-6 text-lg font-semibold text-gray-900">
          Customer not found
        </Text>
        <Button
          variant="secondary"
          onPress={() => router.replace("/customers")}
        >
          Back to Customers
        </Button>
      </View>
    );
  }

  const customer = data.customer;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View className="bg-white px-5 pb-4 pt-14">
        <Pressable
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/customers")
          }
          className="mb-3"
        >
          <Text className="text-sm font-medium text-gray-500">← Customers</Text>
        </Pressable>
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 text-2xl font-bold text-gray-900 mr-3"
            numberOfLines={1}
          >
            {customer.name}
          </Text>
          {!customer.isActive && <Badge label="Inactive" color="gray" />}
        </View>
      </View>

      <View className="px-5 pt-5 gap-5">
        {/* ── Contact ─────────────────────────────────────────────────────── */}
        <View>
          <SectionTitle>Contact</SectionTitle>
          <Card variant="white" padding="md">
            <View className="mb-3 flex-row items-center gap-2">
              <Badge
                label={channelLabels[customer.contactChannel]}
                color={channelColors[customer.contactChannel]}
              />
            </View>
            {customer.phone && <Row label="Phone" value={customer.phone} />}
            {customer.instagramHandle && (
              <Row label="Instagram" value={`@${customer.instagramHandle}`} />
            )}
            {customer.address && (
              <Row label="Address" value={customer.address} />
            )}
          </Card>
        </View>

        {/* ── Tags ────────────────────────────────────────────────────────── */}
        {customer.tags.length > 0 && (
          <View>
            <SectionTitle>Tags</SectionTitle>
            <Card variant="white" padding="md">
              <View className="flex-row flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <Badge
                    key={tag}
                    label={tagLabels[tag]}
                    color={tagColors[tag]}
                  />
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* ── Notes ───────────────────────────────────────────────────────── */}
        {customer.notes && (
          <View>
            <SectionTitle>Notes</SectionTitle>
            <Card variant="white" padding="md">
              <Text className="text-sm text-gray-700">{customer.notes}</Text>
            </Card>
          </View>
        )}

        {/* ── Meta ────────────────────────────────────────────────────────── */}
        <View>
          <SectionTitle>Info</SectionTitle>
          <Card variant="white" padding="md">
            <Row label="Created" value={formatDate(customer.createdAt)} />
            <Row label="Updated" value={formatDate(customer.updatedAt)} />
            <Row
              label="Status"
              value={customer.isActive ? "Active" : "Inactive"}
            />
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

import type { ThemeColors } from "@/constants/Colors";
import { CREATE_CUSTOMER } from "@/lib/graphql/mutations/customer.mutations";
import { LIST_CUSTOMERS } from "@/lib/graphql/queries/customer.queries";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
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

const CHANNEL_ICONS: Record<
  ContactChannel,
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  whatsapp: "logo-whatsapp",
  instagram: "logo-instagram",
  both: "globe-outline",
};

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

function getChannelColor(channel: ContactChannel, C: ThemeColors): string {
  switch (channel) {
    case "whatsapp":
      return C.success;
    case "instagram":
      return C.accent;
    case "both":
      return C.today;
  }
}

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
  const channelColor = getChannelColor(customer.contactChannel, C);
  const contact =
    customer.phone ??
    (customer.instagramHandle ? `@${customer.instagramHandle}` : null);
  const channelIcon = CHANNEL_ICONS[customer.contactChannel];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <Avatar name={customer.name} color={channelColor} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: C.textPrimary }}
          numberOfLines={1}
        >
          {customer.name}
        </Text>
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
        {customer.tags.length > 0 && (
          <View style={{ flexDirection: "row", marginTop: 5 }}>
            {customer.tags.map((tag) => {
              const tagColor = getTagColor(tag, C);
              return (
                <View
                  key={tag}
                  style={{
                    backgroundColor: tagColor + "20",
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
                      color: tagColor,
                    }}
                  >
                    {TAG_LABELS[tag]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ C, isSearch }: { C: ThemeColors; isSearch: boolean }) {
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
        <Ionicons
          name={isSearch ? "search-outline" : "people-outline"}
          size={28}
          color={C.accent}
        />
      </View>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: 6,
        }}
      >
        {isSearch ? "No results found" : "No customers yet"}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: C.textTertiary,
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        {isSearch
          ? "Try a different name, phone or handle"
          : "Customers will appear here once they interact via WhatsApp or are added manually."}
      </Text>
    </View>
  );
}

// ─── Section Divider ──────────────────────────────────────────────────────────

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

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
  C: ThemeColors;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
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
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
          fontSize: 15,
          color: C.textPrimary,
        }}
      />
    </View>
  );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────

function AddCustomerModal({
  visible,
  onClose,
  onSuccess,
  C,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  C: ThemeColors;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [channel, setChannel] = useState<ContactChannel>("whatsapp");

  const CHANNELS: { value: ContactChannel; label: string }[] = [
    { value: "whatsapp", label: "WhatsApp" },
    { value: "instagram", label: "Instagram" },
    { value: "both", label: "Both" },
  ];

  const [createCustomer, { loading }] = useMutation(CREATE_CUSTOMER, {
    onCompleted: () => {
      onSuccess();
      handleClose();
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleClose = () => {
    setName("");
    setPhone("");
    setInstagram("");
    setChannel("whatsapp");
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim()) return Alert.alert("Required", "Name is required.");
    if (!phone.trim() && !instagram.trim())
      return Alert.alert("Required", "Phone or Instagram handle is required.");

    // Normalize phone — undefined if empty (backend rejects null for optional strings)
    let normalizedPhone: string | undefined = undefined;
    if (phone.trim()) {
      const digits = phone.replace(/\D/g, "");
      normalizedPhone = phone.trim().startsWith("+")
        ? phone.trim()
        : `+52${digits}`;
    }

    const normalizedInstagram = instagram.trim() || undefined;

    createCustomer({
      variables: {
        input: {
          name: name.trim(),
          ...(normalizedPhone !== undefined && { phone: normalizedPhone }),
          ...(normalizedInstagram !== undefined && {
            instagramHandle: normalizedInstagram,
          }),
          contactChannel: channel,
          tags: [],
        },
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
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
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
            <Text style={{ fontSize: 15, color: C.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: C.textPrimary,
            }}
          >
            Add Customer
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={C.accent} />
            ) : (
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: C.accent }}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. María García"
            C={C}
          />
          <Field
            label="Phone (WhatsApp)"
            value={phone}
            onChangeText={setPhone}
            placeholder="+52 333 000 0000"
            keyboardType="phone-pad"
            C={C}
          />
          <Field
            label="Instagram Handle"
            value={instagram}
            onChangeText={setInstagram}
            placeholder="@username"
            C={C}
          />

          {/* Channel selector */}
          <View style={{ marginBottom: 16 }}>
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
              Contact Channel
            </Text>
            <View style={{ flexDirection: "row" }}>
              {CHANNELS.map((ch, i) => {
                const selected = channel === ch.value;
                return (
                  <TouchableOpacity
                    key={ch.value}
                    onPress={() => setChannel(ch.value)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: 11,
                      borderRadius: 10,
                      backgroundColor: selected ? C.accentMuted : C.surface,
                      borderWidth: 1,
                      borderColor: selected ? C.accent : C.border,
                      alignItems: "center",
                      marginRight: i < CHANNELS.length - 1 ? 8 : 0,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: selected ? C.accent : C.textSecondary,
                      }}
                    >
                      {ch.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Customers Screen ─────────────────────────────────────────────────────────

const LIMIT = 100;

export default function CustomersScreen() {
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, loading, error, refetch } = useQuery<ListCustomersData>(
    LIST_CUSTOMERS,
    {
      variables: { input: { limit: LIMIT, isActive: true } },
      notifyOnNetworkStatusChange: true,
    },
  );

  const customers = data?.customers.customers ?? [];

  const filtered = searchQuery.trim()
    ? customers.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.instagramHandle ?? "").toLowerCase().includes(q)
        );
      })
    : customers;

  const grouped = filtered
    .reduce<{ letter: string; items: Customer[] }[]>((acc, customer) => {
      const letter = customer.name[0]?.toUpperCase() ?? "#";
      const existing = acc.find((g) => g.letter === letter);
      if (existing) existing.items.push(customer);
      else acc.push({ letter, items: [customer] });
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
          style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 16 }}
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
              {filtered.length}{" "}
              {filtered.length === 1 ? "customer" : "customers"}
              {searchQuery ? " found" : " total"}
            </Text>
          )}

          {/* Search bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: C.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.border,
              paddingHorizontal: 12,
              marginTop: 12,
            }}
          >
            <Ionicons
              name="search-outline"
              size={16}
              color={C.textTertiary}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by name, phone or handle…"
              placeholderTextColor={C.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                paddingVertical: 10,
                fontSize: 14,
                color: C.textPrimary,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={C.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: C.border }} />

        {/* ── List ────────────────────────────────────────────────────── */}
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState C={C} isSearch={searchQuery.length > 0} />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.accent}
            />
          }
          renderItem={({ item }) => {
            if (item.type === "header")
              return <SectionDivider letter={item.letter} C={C} />;
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

        {/* ── FAB ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
          style={{
            position: "absolute",
            bottom: 100,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color={C.background} />
        </TouchableOpacity>
      </View>

      {/* ── Add Customer Modal ───────────────────────────────────────── */}
      <AddCustomerModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => refetch()}
        C={C}
      />
    </>
  );
}

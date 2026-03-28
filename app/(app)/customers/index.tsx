import type { ThemeColors } from "@/constants/Colors";
import { CREATE_CUSTOMER } from "@/lib/graphql/mutations/customer.mutations";
import { LIST_CUSTOMERS } from "@/lib/graphql/queries/customer.queries";
import { useColors } from "@/lib/hooks/useColors";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
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
  tags: CustomerTag[];
  isActive: boolean;
};

type ListCustomersData = {
  customers: {
    customers: Customer[];
    total: number;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "both", label: "Both" },
];

const TAGS: { value: CustomerTag; label: string; color: string }[] = [
  { value: "vip", label: "VIP", color: "#f59e0b" },
  { value: "wholesale", label: "Wholesale", color: "#6366f1" },
  { value: "regular", label: "Regular", color: "#9a9284" },
];

// ─── Style maps ───────────────────────────────────────────────────────────────

const CHANNEL_COLORS: Record<ContactChannel, string> = {
  whatsapp: "#22c55e",
  instagram: "#a855f7",
  both: "#3b82f6",
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

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
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
  placeholder: string;
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
        Tap + to add your first customer, or they'll appear automatically from
        WhatsApp and Instagram.
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
  const [addVisible, setAddVisible] = useState(false);

  // ── Add customer state ──────────────────────────────────────────────────
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newInstagram, setNewInstagram] = useState("");
  const [newChannel, setNewChannel] = useState<ContactChannel>("whatsapp");
  const [newTags, setNewTags] = useState<CustomerTag[]>([]);
  const [newNotes, setNewNotes] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const { data, loading, error, refetch } = useQuery<ListCustomersData>(
    LIST_CUSTOMERS,
    {
      variables: { input: { limit: LIMIT, isActive: true } },
      notifyOnNetworkStatusChange: true,
    },
  );

  const [createCustomer, { loading: creating }] = useMutation(CREATE_CUSTOMER, {
    refetchQueries: [
      {
        query: LIST_CUSTOMERS,
        variables: { input: { limit: LIMIT, isActive: true } },
      },
    ],
    onCompleted: () => {
      setAddVisible(false);
      resetForm();
      Alert.alert("Done", "Customer added.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const resetForm = () => {
    setNewName("");
    setNewPhone("");
    setNewInstagram("");
    setNewChannel("whatsapp");
    setNewTags([]);
    setNewNotes("");
    setNewAddress("");
  };

  const toggleTag = (tag: CustomerTag) => {
    if (newTags.includes(tag)) {
      setNewTags(newTags.filter((t) => t !== tag));
    } else {
      setNewTags([...newTags, tag]);
    }
  };

  const handleCreate = () => {
    if (!newName.trim())
      return Alert.alert("Required", "Customer name is required.");

    if (newChannel === "whatsapp" && !newPhone.trim() && !newInstagram.trim()) {
      return Alert.alert("Required", "Phone number is required for WhatsApp.");
    }
    if (
      newChannel === "instagram" &&
      !newInstagram.trim() &&
      !newPhone.trim()
    ) {
      return Alert.alert(
        "Required",
        "Instagram handle is required for Instagram.",
      );
    }

    createCustomer({
      variables: {
        input: {
          name: newName.trim(),
          phone: newPhone.trim() || null,
          instagramHandle: newInstagram.trim() || null,
          contactChannel: newChannel,
          tags: newTags.length > 0 ? newTags : undefined,
          notes: newNotes.trim() || null,
          address: newAddress.trim() || null,
        },
      },
    });
  };

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
        {/* ── FAB ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setAddVisible(true);
          }}
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
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Add Customer Modal ─────────────────────────────────────── */}
      <Modal
        visible={addVisible}
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
              onPress={() => setAddVisible(false)}
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
              Add Customer
            </Text>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.7}
            >
              {creating ? (
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
            <Field
              label="Name"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. María García"
              C={C}
            />
            <Field
              label="Phone"
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="e.g. +521234567890"
              keyboardType="phone-pad"
              C={C}
            />
            <Field
              label="Instagram"
              value={newInstagram}
              onChangeText={setNewInstagram}
              placeholder="e.g. mariagarcia"
              C={C}
            />

            {/* Channel picker */}
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
                Contact Channel
              </Text>
              <View style={{ flexDirection: "row" }}>
                {CHANNELS.map((ch, i) => {
                  const selected = newChannel === ch.value;
                  return (
                    <TouchableOpacity
                      key={ch.value}
                      onPress={() => setNewChannel(ch.value)}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
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
                {TAGS.map((tag) => {
                  const selected = newTags.includes(tag.value);
                  return (
                    <TouchableOpacity
                      key={tag.value}
                      onPress={() => toggleTag(tag.value)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: selected
                          ? tag.color + "20"
                          : C.surface,
                        borderWidth: 1,
                        borderColor: selected ? tag.color : C.border,
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: selected ? tag.color : C.textSecondary,
                        }}
                      >
                        {tag.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <Field
              label="Address"
              value={newAddress}
              onChangeText={setNewAddress}
              placeholder="Optional"
              C={C}
            />
            <Field
              label="Notes"
              value={newNotes}
              onChangeText={setNewNotes}
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

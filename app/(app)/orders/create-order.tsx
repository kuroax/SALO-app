import { type ThemeColors } from "@/constants/Colors";
import { CREATE_ORDER } from "@/lib/graphql/mutations/order.mutations";
import { LIST_CUSTOMERS } from "@/lib/graphql/queries/customer.queries";
import { LIST_ORDERS } from "@/lib/graphql/queries/order.queries";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
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
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Queries / Mutations ──────────────────────────────────────────────────────

const LIST_PRODUCTS_SIMPLE = gql`
  query ListProductsSimple($filters: ListProductsInput) {
    products(filters: $filters) {
      products {
        id
        name
        brand
        price
        variants {
          size
          color
        }
      }
    }
  }
`;

const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      phone
      instagramHandle
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  brand: string;
  price: number;
  variants: { size: string; color: string }[];
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  instagramHandle: string | null;
};

type OrderLineItem = {
  productId: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

// Manual orders created from the app always use "whatsapp" channel internally.
// Channel selection is removed from the UI — only the bot uses whatsapp/instagram.
const DEFAULT_COLOR = "default";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

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
  keyboardType?: "default" | "decimal-pad" | "phone-pad";
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
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 10,
          paddingVertical: 11,
          paddingHorizontal: 14,
          fontSize: 14,
          color: C.textPrimary,
        }}
      />
    </View>
  );
}

// ─── Create Order Screen ──────────────────────────────────────────────────────

const LIMIT = 100;

export default function CreateOrderScreen() {
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<OrderLineItem[]>([]);

  // Modals
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // ── Inline new customer state ──────────────────────────────────────────────
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerInstagram, setNewCustomerInstagram] = useState("");

  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");

  // Queries
  const { data: customersData, refetch: refetchCustomers } = useQuery<{
    customers: { customers: Customer[] };
  }>(LIST_CUSTOMERS, {
    variables: { input: { limit: LIMIT, isActive: true } },
  });
  const { data: productsData } = useQuery<{
    products: { products: Product[] };
  }>(LIST_PRODUCTS_SIMPLE, {
    variables: { filters: { status: "active", limit: 50 } },
  });

  const [createOrder, { loading: creating }] = useMutation<{
    createOrder: { orderNumber: string };
  }>(CREATE_ORDER, {
    refetchQueries: [
      { query: LIST_ORDERS, variables: { filter: { limit: 20, skip: 0 } } },
    ],
    onCompleted: (data) => {
      const orderNumber = data?.createOrder?.orderNumber ?? "Order";
      Alert.alert("Order Created", `${orderNumber} was created.`, [
        { text: "Done", onPress: () => router.back() },
      ]);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const [createCustomer, { loading: creatingCustomer }] = useMutation<{
    createCustomer: Customer;
  }>(CREATE_CUSTOMER, {
    onCompleted: async (data) => {
      const c = data.createCustomer;
      await refetchCustomers();
      setCustomerId(c.id);
      setCustomerName(c.name);
      setShowNewCustomerForm(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerInstagram("");
      setCustomerPickerVisible(false);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const customers: Customer[] = customersData?.customers?.customers ?? [];
  const products: Product[] = productsData?.products?.products ?? [];

  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()),
      )
    : customers;

  const filteredProducts = productSearch
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.brand.toLowerCase().includes(productSearch.toLowerCase()),
      )
    : products;

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const selectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPickerVisible(false);
    setCustomerSearch("");
    setShowNewCustomerForm(false);
  };

  const clearCustomer = () => {
    setCustomerId(null);
    setCustomerName("");
  };

  const openProductPicker = () => {
    setSelectedProduct(null);
    setSelectedSize(null);
    setItemQty("1");
    setItemPrice("");
    setProductSearch("");
    setProductPickerVisible(true);
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setItemPrice(String(p.price));
    setSelectedSize(null);
  };

  const confirmAddItem = () => {
    if (!selectedProduct) return;
    if (!selectedSize) return Alert.alert("Required", "Select a size.");
    const qty = Math.max(1, parseInt(itemQty, 10) || 1);
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0)
      return Alert.alert("Invalid", "Enter a valid price.");

    const color =
      selectedProduct.variants.find((v) => v.size === selectedSize)?.color ??
      DEFAULT_COLOR;

    setItems([
      ...items,
      {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        size: selectedSize,
        color,
        quantity: qty,
        unitPrice: price,
      },
    ]);
    setProductPickerVisible(false);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!customerId)
      return Alert.alert("Required", "Please select a customer.");
    if (items.length === 0)
      return Alert.alert("Required", "Add at least one item.");

    createOrder({
      variables: {
        input: {
          customerId,
          channel: "whatsapp",
          items: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
    });
  };

  const normalizePhone = (raw: string): string => {
    const cleaned = raw.replace(/[^\d+]/g, "");
    if (cleaned.length > 0 && !cleaned.startsWith("+")) {
      return `+52${cleaned}`;
    }
    return cleaned;
  };

  const handleSaveNewCustomer = () => {
    const name = newCustomerName.trim();
    const rawPhone = newCustomerPhone.trim();
    const instagram = newCustomerInstagram.trim().replace(/^@/, "");
    if (!name) return Alert.alert("Required", "Enter a customer name.");
    if (!rawPhone && !instagram)
      return Alert.alert(
        "Required",
        "Enter a phone number or Instagram handle.",
      );
    const phone = rawPhone ? normalizePhone(rawPhone) : undefined;
    const contactChannel = instagram && !rawPhone ? "instagram" : "whatsapp";
    createCustomer({
      variables: {
        input: {
          name,
          contactChannel,
          ...(phone ? { phone } : {}),
          ...(instagram ? { instagramHandle: instagram } : {}),
        },
      },
    });
  };

  const closeCustomerPicker = () => {
    setCustomerPickerVisible(false);
    setCustomerSearch("");
    setShowNewCustomerForm(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerInstagram("");
  };

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* ── Header ────────────────────────────────────────────────── */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 64,
              paddingBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                marginBottom: 32,
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
            <Text
              style={{
                fontSize: 26,
                fontWeight: "800",
                color: C.textPrimary,
                letterSpacing: -0.5,
              }}
            >
              Create Order
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* ── Customer ──────────────────────────────────────────────── */}
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
                Customer
              </Text>
              {customerId ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.accent,
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                  }}
                >
                  <Ionicons
                    name="person"
                    size={16}
                    color={C.accent}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: "600",
                      color: C.textPrimary,
                    }}
                  >
                    {customerName}
                  </Text>
                  <TouchableOpacity onPress={clearCustomer} activeOpacity={0.7}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={C.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    setCustomerSearch("");
                    setShowNewCustomerForm(false);
                    setCustomerPickerVisible(true);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 10,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                  }}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={16}
                    color={C.textTertiary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ fontSize: 14, color: C.textTertiary }}>
                    Select customer
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Items ──────────────────────────────────────────────────── */}
            <View style={{ marginBottom: 16 }}>
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
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1,
                    color: C.textTertiary,
                    textTransform: "uppercase",
                  }}
                >
                  Items
                </Text>
                <TouchableOpacity
                  onPress={openProductPicker}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.accentMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={C.accent}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: C.accent,
                    }}
                  >
                    Add Item
                  </Text>
                </TouchableOpacity>
              </View>

              {items.length === 0 ? (
                <View
                  style={{
                    padding: 20,
                    backgroundColor: C.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, color: C.textTertiary }}>
                    No items yet — tap Add Item
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    backgroundColor: C.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    overflow: "hidden",
                  }}
                >
                  {items.map((item, i) => (
                    <View
                      key={`${item.productId}-${item.size}-${i}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 14,
                        borderBottomWidth: i < items.length - 1 ? 1 : 0,
                        borderBottomColor: C.border,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: C.textPrimary,
                          }}
                        >
                          {item.productName}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: C.textTertiary,
                            marginTop: 2,
                          }}
                        >
                          {item.size} · {item.quantity} ×{" "}
                          {currencyFormatter.format(item.unitPrice)}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: C.textPrimary,
                          marginRight: 12,
                        }}
                      >
                        {currencyFormatter.format(
                          item.quantity * item.unitPrice,
                        )}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeItem(i)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={C.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Subtotal */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      padding: 14,
                      borderTopWidth: 1,
                      borderTopColor: C.border,
                      backgroundColor: C.background,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: C.textPrimary,
                      }}
                    >
                      Total
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: C.accent,
                      }}
                    >
                      {currencyFormatter.format(subtotal)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── Submit ──────────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.8}
              style={{
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 8,
                opacity: creating ? 0.7 : 1,
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              {creating && (
                <ActivityIndicator
                  size="small"
                  color={C.background}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: C.background,
                }}
              >
                {creating ? "Creating…" : "Create Order"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Customer Picker Modal ──────────────────────────────────────── */}
      <Modal
        visible={customerPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: C.background }}>
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
            <TouchableOpacity onPress={closeCustomerPicker} activeOpacity={0.7}>
              <Text
                style={{ fontSize: 15, color: C.accent, fontWeight: "500" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}
            >
              {showNewCustomerForm ? "New Customer" : "Select Customer"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (showNewCustomerForm) {
                  handleSaveNewCustomer();
                } else {
                  setShowNewCustomerForm(true);
                  setCustomerSearch("");
                }
              }}
              activeOpacity={0.7}
            >
              {creatingCustomer ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Text
                  style={{ fontSize: 15, color: C.accent, fontWeight: "700" }}
                >
                  {showNewCustomerForm ? "Save" : "New"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {showNewCustomerForm ? (
            /* ── Inline create customer form ──────────────────────────── */
            <ScrollView
              contentContainerStyle={{
                padding: 20,
                paddingBottom: 60,
              }}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                label="Name"
                value={newCustomerName}
                onChangeText={setNewCustomerName}
                placeholder="Full name"
                C={C}
              />
              <Field
                label="Phone"
                value={newCustomerPhone}
                onChangeText={setNewCustomerPhone}
                placeholder="+52 33 1234 5678"
                keyboardType="phone-pad"
                C={C}
              />
              <Field
                label="Instagram"
                value={newCustomerInstagram}
                onChangeText={setNewCustomerInstagram}
                placeholder="@handle"
                C={C}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: C.textTertiary,
                  marginTop: 4,
                  lineHeight: 18,
                }}
              >
                Name is required. Phone or Instagram is required.
              </Text>
            </ScrollView>
          ) : (
            /* ── Customer list ────────────────────────────────────────── */
            <>
              <View style={{ padding: 20, paddingBottom: 10 }}>
                <TextInput
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholder="Search customers…"
                  placeholderTextColor={C.textTertiary}
                  autoCapitalize="none"
                  style={{
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 10,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    color: C.textPrimary,
                  }}
                />
              </View>

              <FlatList
                data={filteredCustomers}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 40,
                }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: c }) => (
                  <TouchableOpacity
                    onPress={() => selectCustomer(c)}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: C.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: C.textPrimary,
                      }}
                    >
                      {c.name}
                    </Text>
                    {(c.phone || c.instagramHandle) && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.textTertiary,
                          marginTop: 2,
                        }}
                      >
                        {c.phone ?? `@${c.instagramHandle}`}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textTertiary,
                      textAlign: "center",
                      paddingVertical: 40,
                    }}
                  >
                    No customers found
                  </Text>
                }
              />
            </>
          )}
        </View>
      </Modal>

      {/* ── Product Picker Modal ───────────────────────────────────────── */}
      <Modal
        visible={productPickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: C.background }}>
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
              onPress={() => setProductPickerVisible(false)}
              activeOpacity={0.7}
            >
              <Text
                style={{ fontSize: 15, color: C.accent, fontWeight: "500" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: C.textPrimary }}
            >
              {selectedProduct ? "Configure Item" : "Select Product"}
            </Text>
            {selectedProduct ? (
              <TouchableOpacity onPress={confirmAddItem} activeOpacity={0.7}>
                <Text
                  style={{ fontSize: 15, color: C.accent, fontWeight: "700" }}
                >
                  Add
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {!selectedProduct ? (
            <>
              <View style={{ padding: 20, paddingBottom: 10 }}>
                <TextInput
                  value={productSearch}
                  onChangeText={setProductSearch}
                  placeholder="Search products…"
                  placeholderTextColor={C.textTertiary}
                  autoCapitalize="none"
                  style={{
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 10,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    color: C.textPrimary,
                  }}
                />
              </View>

              <FlatList
                data={filteredProducts}
                keyExtractor={(p) => p.id}
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingBottom: 40,
                }}
                renderItem={({ item: p }) => (
                  <TouchableOpacity
                    onPress={() => selectProduct(p)}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: C.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: C.textPrimary,
                      }}
                    >
                      {p.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 2,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: C.textTertiary }}>
                        {p.brand}
                      </Text>
                      <Text style={{ fontSize: 12, color: C.textSecondary }}>
                        {currencyFormatter.format(p.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textTertiary,
                      textAlign: "center",
                      paddingVertical: 40,
                    }}
                  >
                    No products found
                  </Text>
                }
              />
            </>
          ) : (
            <ScrollView
              contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
            >
              {/* Selected product info */}
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.accent,
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: C.textPrimary,
                  }}
                >
                  {selectedProduct.name}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: C.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {selectedProduct.brand} ·{" "}
                  {currencyFormatter.format(selectedProduct.price)}
                </Text>
              </View>

              {/* Size picker */}
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
                Size
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 16,
                }}
              >
                {selectedProduct.variants.length > 0 ? (
                  [...new Set(selectedProduct.variants.map((v) => v.size))].map(
                    (size) => {
                      const selected = selectedSize === size;
                      return (
                        <TouchableOpacity
                          key={size}
                          onPress={() => setSelectedSize(size)}
                          activeOpacity={0.7}
                          style={{
                            paddingHorizontal: 18,
                            paddingVertical: 10,
                            borderRadius: 10,
                            backgroundColor: selected
                              ? C.accentMuted
                              : C.surface,
                            borderWidth: 1,
                            borderColor: selected ? C.accent : C.border,
                            marginRight: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: selected ? C.accent : C.textSecondary,
                            }}
                          >
                            {size}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )
                ) : (
                  <Text
                    style={{
                      fontSize: 13,
                      color: C.textTertiary,
                      fontStyle: "italic",
                    }}
                  >
                    No sizes available — add sizes to this product first
                  </Text>
                )}
              </View>

              {/* Quantity */}
              <Field
                label="Quantity"
                value={itemQty}
                onChangeText={setItemQty}
                placeholder="1"
                keyboardType="decimal-pad"
                C={C}
              />

              {/* Unit Price */}
              <Field
                label="Unit Price (MXN)"
                value={itemPrice}
                onChangeText={setItemPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
                C={C}
              />
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

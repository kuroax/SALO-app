import type { ThemeColors } from "@/constants/Colors";
import {
  ADD_STOCK,
  REMOVE_STOCK,
} from "@/lib/graphql/mutations/inventory.mutations";
import {
  DELETE_PRODUCT,
  UPDATE_PRODUCT,
} from "@/lib/graphql/mutations/product.mutations";
import { GET_PRODUCT_INVENTORY } from "@/lib/graphql/queries/inventory.queries";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Constants ───────────────────────────────────────────────────────────────

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type Size = (typeof SIZES)[number];
const DEFAULT_COLOR = "default";

// ─── Cloudinary ───────────────────────────────────────────────────────────────

const CLOUD_NAME = "dt4j7wevk";
const UPLOAD_PRESET = "salo_products";

async function uploadToCloudinary(uri: string): Promise<string> {
  const filename = uri.split("/").pop() ?? "image.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";
  const formData = new FormData();
  formData.append("file", { uri, name: filename, type } as never);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url as string;
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      brand
      description
      price
      gender
      categoryGroup
      subcategory
      images
      status
      variants {
        size
        color
      }
      createdAt
      updatedAt
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  gender: string;
  categoryGroup: string;
  subcategory: string;
  images: string[];
  status: string;
  variants: { size: string; color: string }[];
  createdAt: string;
  updatedAt: string;
};

type InventoryItem = {
  id: string;
  productId: string;
  size: string;
  color: string;
  quantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
};

type GetProductData = { product: Product };
type GetProductInventoryData = { productInventory: InventoryItem[] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
        numberOfLines={2}
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
  multiline,
  keyboardType,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "decimal-pad";
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
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="none"
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

// ─── Variant Row ──────────────────────────────────────────────────────────────

function VariantRow({
  item,
  onAdd,
  onRemove,
  isLoading,
  isLast,
  C,
}: {
  item: InventoryItem;
  onAdd: () => void;
  onRemove: () => void;
  isLoading: boolean;
  isLast: boolean;
  C: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.textPrimary }}>
          {item.size}
        </Text>
        {item.isLowStock && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: C.pending,
              marginTop: 2,
            }}
          >
            Low stock · threshold {item.lowStockThreshold}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          onPress={onRemove}
          disabled={isLoading || item.quantity === 0}
          activeOpacity={0.7}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: C.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading || item.quantity === 0 ? 0.35 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: C.textPrimary,
              lineHeight: 22,
            }}
          >
            −
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            width: 40,
            textAlign: "center",
            fontSize: 16,
            fontWeight: "700",
            color: item.isLowStock ? C.pending : C.textPrimary,
          }}
        >
          {item.quantity}
        </Text>
        <TouchableOpacity
          onPress={onAdd}
          disabled={isLoading}
          activeOpacity={0.7}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: C.accent,
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading ? 0.35 : 1,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: C.background,
              lineHeight: 22,
            }}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Product Detail Screen ────────────────────────────────────────────────────

export default function ProductDetailScreen() {
  const { productId, productName } = useLocalSearchParams<{
    productId: string;
    productName: string;
  }>();
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategoryGroup, setEditCategoryGroup] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editSizes, setEditSizes] = useState<Size[]>([]);
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const validId =
    typeof productId === "string" && productId.length > 0 ? productId : null;

  const refetchInventory = [
    { query: GET_PRODUCT_INVENTORY, variables: { productId: validId } },
  ];
  const refetchProduct = [{ query: GET_PRODUCT, variables: { id: validId } }];

  const { data: productData, loading: productLoading } =
    useQuery<GetProductData>(GET_PRODUCT, {
      variables: { id: validId },
      skip: !validId,
    });

  const { data: inventoryData } = useQuery<GetProductInventoryData>(
    GET_PRODUCT_INVENTORY,
    {
      variables: { productId: validId },
      skip: !validId,
    },
  );

  const [addStock, { loading: adding }] = useMutation(ADD_STOCK, {
    refetchQueries: refetchInventory,
  });
  const [removeStock, { loading: removing }] = useMutation(REMOVE_STOCK, {
    refetchQueries: refetchInventory,
  });
  const [updateProduct, { loading: updating }] = useMutation(UPDATE_PRODUCT, {
    refetchQueries: [...refetchProduct, ...refetchInventory],
    onCompleted: () => {
      setEditVisible(false);
      Alert.alert("Updated", "Product updated successfully.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });
  const [deleteProduct, { loading: deleting }] = useMutation(DELETE_PRODUCT, {
    onCompleted: () => {
      Alert.alert("Deleted", "Product removed from inventory.", [
        { text: "OK", onPress: () => router.replace("/inventory") },
      ]);
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const isLoading = adding || removing;
  const product = productData?.product;
  const items = inventoryData?.productInventory ?? [];
  const lowCount = items.filter((i) => i.isLowStock).length;

  const handleAdd = (item: InventoryItem) => {
    addStock({
      variables: {
        input: {
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: 1,
        },
      },
    }).catch((err) => Alert.alert("Error", err.message));
  };

  const handleRemove = (item: InventoryItem) => {
    if (item.quantity === 0) return;
    removeStock({
      variables: {
        input: {
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: 1,
        },
      },
    }).catch((err) => Alert.alert("Error", err.message));
  };

  const openEdit = () => {
    if (!product) return;
    setEditName(product.name);
    setEditBrand(product.brand);
    setEditDescription(product.description);
    setEditPrice(String(product.price));
    setEditCategoryGroup(product.categoryGroup);
    setEditSubcategory(product.subcategory);
    setEditSizes(
      (product.variants ?? [])
        .map((v) => v.size.toUpperCase())
        .filter((s): s is Size => SIZES.includes(s as Size)),
    );
    setEditImageUri(null);
    setEditImageUrl(product.images?.[0] ?? null);
    setEditVisible(true);
  };

  const toggleEditSize = (size: Size) => {
    if (editSizes.includes(size)) {
      setEditSizes(editSizes.filter((s) => s !== size));
    } else {
      setEditSizes([...editSizes, size]);
    }
  };

  const pickEditImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEditImageUri(result.assets[0].uri);
      setEditImageUrl(result.assets[0].uri);
    }
  };

  const handleUpdate = async () => {
    if (!validId) return;
    if (!editName.trim()) return Alert.alert("Required", "Name is required.");
    if (!editBrand.trim()) return Alert.alert("Required", "Brand is required.");
    if (editDescription.trim().length < 10)
      return Alert.alert(
        "Required",
        "Description must be at least 10 characters.",
      );
    if (!editPrice.trim() || isNaN(parseFloat(editPrice)))
      return Alert.alert("Invalid", "Enter a valid price.");

    let images: string[] | undefined;
    if (editImageUri) {
      try {
        setUploading(true);
        images = [await uploadToCloudinary(editImageUri)];
      } catch {
        Alert.alert("Upload failed", "Could not upload image.");
        return;
      } finally {
        setUploading(false);
      }
    }

    updateProduct({
      variables: {
        id: validId,
        input: {
          name: editName.trim(),
          brand: editBrand.trim(),
          description: editDescription.trim(),
          price: parseFloat(editPrice),
          categoryGroup: editCategoryGroup.trim(),
          subcategory: editSubcategory.trim(),
          variants: editSizes.map((size) => ({
            size,
            color: DEFAULT_COLOR,
          })),
          ...(images ? { images } : {}),
        },
      },
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Product",
      `Remove "${product?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProduct({ variables: { id: validId } }),
        },
      ],
    );
  };

  if (!validId || productLoading) {
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

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 }}
        >
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/inventory")
            }
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
              Inventory
            </Text>
          </TouchableOpacity>

          {/* Product image + name */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 14,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.border,
                overflow: "hidden",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              {product?.images?.[0] ? (
                <Image
                  source={{ uri: product.images[0] }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="cube-outline"
                  size={30}
                  color={C.textTertiary}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: C.textPrimary,
                  letterSpacing: -0.5,
                }}
                numberOfLines={2}
              >
                {product?.name ?? productName ?? "Product"}
              </Text>
              <Text
                style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}
              >
                {product?.brand}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={{ flexDirection: "row" }}>
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
              disabled={deleting}
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
                {deleting ? "Deleting…" : "Delete"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* ── Product Info ─────────────────────────────────────── */}
          <Section title="Product Info" C={C}>
            <InfoRow
              label="Price"
              value={currencyFormatter.format(product?.price ?? 0)}
              C={C}
            />
            <InfoRow label="Gender" value={product?.gender ?? "—"} C={C} />
            <InfoRow
              label="Category"
              value={product?.categoryGroup ?? "—"}
              C={C}
            />
            <InfoRow
              label="Subcategory"
              value={product?.subcategory ?? "—"}
              C={C}
            />
            <InfoRow label="Status" value={product?.status ?? "—"} C={C} />
            <InfoRow
              label="Created"
              value={product?.createdAt ? formatDate(product.createdAt) : "—"}
              C={C}
            />
            <InfoRow
              label="Updated"
              value={product?.updatedAt ? formatDate(product.updatedAt) : "—"}
              C={C}
              last
            />
          </Section>

          {/* ── Description ──────────────────────────────────────── */}
          {product?.description && (
            <Section title="Description" C={C}>
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: C.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  {product.description}
                </Text>
              </View>
            </Section>
          )}

          {/* ── Stock ────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: C.textTertiary,
                textTransform: "uppercase",
              }}
            >
              Stock
            </Text>
            {lowCount > 0 && (
              <View
                style={{
                  backgroundColor: C.pendingBg,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: "700", color: C.pending }}
                >
                  {lowCount} low stock
                </Text>
              </View>
            )}
          </View>

          {items.length === 0 ? (
            <View
              style={{
                padding: 20,
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 13, color: C.textTertiary }}>
                No sizes tracked yet — tap Edit to add sizes
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              {items.map((item, index) => (
                <VariantRow
                  key={item.size}
                  item={item}
                  onAdd={() => handleAdd(item)}
                  onRemove={() => handleRemove(item)}
                  isLoading={isLoading}
                  isLast={index === items.length - 1}
                  C={C}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Edit Modal ───────────────────────────────────────────── */}
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
              Edit Product
            </Text>
            <TouchableOpacity
              onPress={handleUpdate}
              disabled={updating || uploading}
              activeOpacity={0.7}
            >
              {updating || uploading ? (
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
            {/* Image */}
            <TouchableOpacity
              onPress={pickEditImage}
              activeOpacity={0.8}
              style={{
                height: 140,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: editImageUrl ? C.accent : C.border,
                borderStyle: editImageUrl ? "solid" : "dashed",
                backgroundColor: C.surface,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              {editImageUrl ? (
                <>
                  <Image
                    source={{ uri: editImageUrl }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      backgroundColor: C.accent,
                      borderRadius: 16,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="pencil"
                      size={11}
                      color={C.background}
                      style={{ marginRight: 3 }}
                    />
                    <Text
                      style={{ fontSize: 11, fontWeight: "700", color: C.background }}
                    >
                      Change
                    </Text>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons
                    name="camera-outline"
                    size={24}
                    color={C.accent}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={{ fontSize: 13, color: C.textSecondary }}>
                    Tap to upload image
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <EditField
              label="Name"
              value={editName}
              onChangeText={setEditName}
              C={C}
            />
            <EditField
              label="Brand"
              value={editBrand}
              onChangeText={setEditBrand}
              C={C}
            />
            <EditField
              label="Description"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              C={C}
            />
            <EditField
              label="Price (MXN)"
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="decimal-pad"
              C={C}
            />
            <EditField
              label="Category Group"
              value={editCategoryGroup}
              onChangeText={setEditCategoryGroup}
              C={C}
            />
            <EditField
              label="Subcategory"
              value={editSubcategory}
              onChangeText={setEditSubcategory}
              C={C}
            />

            {/* ── Size picker ──────────────────────────────────────── */}
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
                Available Sizes
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                }}
              >
                {SIZES.map((s) => {
                  const selected = editSizes.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => toggleEditSize(s)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 18,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: selected ? C.accentMuted : C.surface,
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
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

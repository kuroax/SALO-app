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
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGES = 5;
const SIZES = ["XS", "S", "M", "L", "XL"] as const;
type Size = (typeof SIZES)[number];

const SCREEN_WIDTH = Dimensions.get("window").width;
const CAROUSEL_WIDTH = SCREEN_WIDTH - 40;

// Stock bar: 20 units = full bar width
const STOCK_BAR_TOTAL = 64;
const STOCK_BAR_REF = 20;

// Scroll threshold at which the sticky header fully appears
const STICKY_FADE_START = 160;
const STICKY_FADE_END = 220;

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
  if (!data.secure_url || typeof data.secure_url !== "string") {
    throw new Error("Image upload failed: invalid response from server");
  }
  return data.secure_url;
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
      searchKeywords
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
  searchKeywords: string[];
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

const priceFormatter = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Explicit en-US locale prevents the device-locale "abr 2026" bug
// (same issue flagged across Dashboard and Orders screens)
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Variant helpers ──────────────────────────────────────────────────────────
// :: separator prevents collision between e.g. "XL" + "black-white" and
// "XL-black" + "white" that a plain "-" join would produce.

function normalizeSize(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function isSize(value: string): value is Size {
  return (SIZES as readonly string[]).includes(value);
}

function variantKey(size: string, color: string): string {
  return `${normalizeSize(size)}::${normalizeColor(color)}`;
}

// Deduplicates sizes from a variants array.
// In the Option-B model (one product per color) all variants share the same
// color, so duplicates shouldn't appear — but we guard against them
// defensively in case of data inconsistency or future model changes.
function uniqueSizesFromVariants(variants: Product["variants"]): Size[] {
  const seen = new Set<Size>();
  for (const v of variants ?? []) {
    const s = normalizeSize(v.size);
    if (isSize(s)) seen.add(s);
  }
  // Return in canonical SIZES order so chips render consistently
  return SIZES.filter((s) => seen.has(s));
}

// ─── Sticky Header ────────────────────────────────────────────────────────────

function StickyHeader({
  productName,
  opacity,
  insetTop,
  onBack,
  onMore,
  C,
}: {
  productName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opacity: Animated.AnimatedInterpolation<any>;
  insetTop: number;
  onBack: () => void;
  onMore: () => void;
  C: ThemeColors;
}) {
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        opacity,
        backgroundColor: C.background,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
        paddingTop: insetTop + 6,
        paddingBottom: 12,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={20} color={C.accent} />
      </TouchableOpacity>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "700",
          color: C.textPrimary,
          textAlign: "center",
          marginHorizontal: 12,
        }}
      >
        {productName}
      </Text>
      <TouchableOpacity
        onPress={onMore}
        activeOpacity={0.6}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="ellipsis-horizontal"
          size={20}
          color={C.textSecondary}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, C }: { status: string; C: ThemeColors }) {
  const isActive = status === "active";
  const isInactive = status === "inactive";
  const bg = isActive ? C.successBg : isInactive ? C.alertBg : C.surface;
  const text = isActive ? C.success : isInactive ? C.alert : C.textSecondary;
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: text,
          letterSpacing: 0.5,
        }}
      >
        {status.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Image Carousel ───────────────────────────────────────────────────────────

function ImageCarousel({ images, C }: { images: string[]; C: ThemeColors }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CAROUSEL_WIDTH);
    setActiveIndex(index);
  };
  if (images.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ borderRadius: 16, overflow: "hidden" }}
        contentContainerStyle={{ borderRadius: 16 }}
      >
        {images.map((uri, i) => (
          <View
            key={i}
            style={{
              width: CAROUSEL_WIDTH,
              aspectRatio: 1,
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>
      {images.length > 1 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          {images.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? C.accent : C.border,
                marginHorizontal: 3,
              }}
            />
          ))}
        </View>
      )}
      {images.length > 1 && (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(0,0,0,0.5)",
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
            {activeIndex + 1}/{images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  last,
  muted,
  C,
}: {
  label: string;
  value: string;
  last?: boolean;
  muted?: boolean;
  C: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: muted ? 10 : 12,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <Text
        style={{
          fontSize: muted ? 12 : 13,
          color: muted ? C.textTertiary : C.textSecondary,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: muted ? 12 : 13,
          fontWeight: muted ? "400" : "600",
          color: muted ? C.textTertiary : C.textPrimary,
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

// ─── Read-Only Stock Row ──────────────────────────────────────────────────────
// Shown when stockEditMode is false. A green progress bar replaces the
// +/– steppers so the owner can scan quantities at a glance without
// accidentally tapping an adjustment.

function ReadOnlyStockRow({
  item,
  isLast,
  C,
}: {
  item: InventoryItem;
  isLast: boolean;
  C: ThemeColors;
}) {
  const fillRatio = Math.min(item.quantity / STOCK_BAR_REF, 1);
  const barFill = fillRatio * STOCK_BAR_TOTAL;
  const barColor = item.isLowStock ? C.pending : C.success;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      {/* Size + color */}
      <View style={{ width: 60 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.textPrimary }}>
          {item.size}
        </Text>
        {item.color && item.color !== "default" && (
          <Text
            style={{
              fontSize: 11,
              color: C.textSecondary,
              marginTop: 1,
              textTransform: "capitalize",
            }}
          >
            {item.color}
          </Text>
        )}
      </View>

      {/* Bar */}
      <View style={{ flex: 1, marginHorizontal: 14 }}>
        <View
          style={{
            width: STOCK_BAR_TOTAL,
            height: 4,
            backgroundColor: C.border,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: barFill,
              height: 4,
              backgroundColor: barColor,
              borderRadius: 2,
            }}
          />
        </View>
        {item.isLowStock && (
          <Text style={{ fontSize: 10, color: C.pending, marginTop: 3 }}>
            Low · min {item.lowStockThreshold}
          </Text>
        )}
      </View>

      {/* Quantity */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: item.isLowStock ? C.pending : C.textPrimary,
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {item.quantity}
      </Text>
      <Text style={{ fontSize: 11, color: C.textSecondary, marginLeft: 6 }}>
        units
      </Text>
    </View>
  );
}

// ─── Editable Stock Row ───────────────────────────────────────────────────────
// Shown when stockEditMode is true. Each tap immediately commits via the
// ADD_STOCK / REMOVE_STOCK mutations — same behaviour as before, now gated
// behind an explicit "Edit Stock" action.

function EditableStockRow({
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
        {item.color && item.color !== "default" && (
          <Text
            style={{
              fontSize: 11,
              color: C.textSecondary,
              marginTop: 1,
              textTransform: "capitalize",
            }}
          >
            {item.color}
          </Text>
        )}
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

// ─── Edit Image Grid ──────────────────────────────────────────────────────────

function EditImageGrid({
  images,
  onAdd,
  onRemove,
  C,
}: {
  images: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  C: ThemeColors;
}) {
  const canAdd = images.length < MAX_IMAGES;
  return (
    <View style={{ marginBottom: 20 }}>
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
          Product Images
        </Text>
        <Text style={{ fontSize: 11, color: C.textTertiary }}>
          {images.length}/{MAX_IMAGES}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {images.map((uri, index) => (
          <View
            key={index}
            style={{
              width: "30%",
              aspectRatio: 1,
              marginRight: index % 3 !== 2 ? "5%" : 0,
              marginBottom: 10,
              borderRadius: 12,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <Image
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={() => onRemove(index)}
              activeOpacity={0.8}
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: "rgba(0,0,0,0.6)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={13} color="#fff" />
            </TouchableOpacity>
            {index === 0 && (
              <View
                style={{
                  position: "absolute",
                  bottom: 5,
                  left: 5,
                  backgroundColor: C.accent,
                  borderRadius: 4,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>
                  MAIN
                </Text>
              </View>
            )}
          </View>
        ))}
        {canAdd && (
          <TouchableOpacity
            onPress={onAdd}
            activeOpacity={0.8}
            style={{
              width: "30%",
              aspectRatio: 1,
              marginRight: images.length % 3 !== 2 ? "5%" : 0,
              marginBottom: 10,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: C.border,
              borderStyle: "dashed",
              backgroundColor: C.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="add" size={24} color={C.accent} />
            <Text style={{ fontSize: 10, color: C.textTertiary, marginTop: 3 }}>
              Add photo
            </Text>
          </TouchableOpacity>
        )}
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
  const insets = useSafeAreaInsets();

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editCategoryGroup, setEditCategoryGroup] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editSizes, setEditSizes] = useState<Size[]>([]);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [uploading, setUploading] = useState(false);

  // ── UX state ──────────────────────────────────────────────────────────────
  // stockEditMode: gates the +/– steppers behind an intentional tap.
  // Default read-only prevents accidental stock mutations on scroll.
  const [stockEditMode, setStockEditMode] = useState(false);
  // descriptionExpanded: collapses long marketing copy to 3 lines by default
  // so the Stock section stays visible without scrolling.
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // ── Animated scroll for sticky header ────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const stickyOpacity = scrollY.interpolate({
    inputRange: [STICKY_FADE_START, STICKY_FADE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // ── Validation ────────────────────────────────────────────────────────────
  const validId =
    typeof productId === "string" && productId.length > 0 ? productId : null;

  const refetchInventory = [
    { query: GET_PRODUCT_INVENTORY, variables: { productId: validId } },
  ];
  const refetchProduct = [{ query: GET_PRODUCT, variables: { id: validId } }];

  // ── Queries ───────────────────────────────────────────────────────────────
  const {
    data: productData,
    loading: productLoading,
    error: productError,
  } = useQuery<GetProductData>(GET_PRODUCT, {
    variables: { id: validId },
    skip: !validId,
  });

  const {
    data: inventoryData,
    loading: inventoryLoading,
    error: inventoryError,
  } = useQuery<GetProductInventoryData>(GET_PRODUCT_INVENTORY, {
    variables: { productId: validId },
    skip: !validId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
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

  // ── Derived data ──────────────────────────────────────────────────────────
  const isStockLoading = adding || removing;
  const product = productData?.product;

  // Compound (size, color) filter prevents orphaned "default" color records
  // from appearing alongside migrated records. Uses variantKey with :: separator
  // to prevent collision bugs that a plain "-" join can produce.
  const activeVariantKeys = new Set(
    (product?.variants ?? []).map((v) => variantKey(v.size, v.color)),
  );
  const items = (inventoryData?.productInventory ?? []).filter((item) =>
    activeVariantKeys.has(variantKey(item.size, item.color)),
  );
  const lowCount = items.filter((i) => i.isLowStock).length;

  // ── Stock handlers ────────────────────────────────────────────────────────
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

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!product) return;
    setEditName(product.name);
    setEditBrand(product.brand);
    setEditDescription(product.description);
    setEditPrice(String(product.price));
    // Defensive color read: find the first variant that has a real color value
    // rather than relying on array position. Guards against future reordering
    // from the backend and the pre-migration "default" sentinel value.
    const productColor =
      product.variants.find((v) => v.color && v.color !== "default")?.color ??
      "";
    setEditColor(productColor);
    setEditCategoryGroup(product.categoryGroup);
    setEditSubcategory(product.subcategory);
    // uniqueSizesFromVariants deduplicates sizes and returns them in canonical
    // SIZES order, preventing duplicate chip renders caused by multi-color data.
    setEditSizes(uniqueSizesFromVariants(product.variants ?? []));
    setEditImages(product.images ?? []);
    // Load only manual keywords — auto-keywords (subcategory, categoryGroup)
    // are re-applied by the server on every save.
    setEditKeywords(product.searchKeywords ?? []);
    setKeywordInput("");
    setEditVisible(true);
  };

  const toggleEditSize = (size: Size) => {
    setEditSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const pickEditImage = async () => {
    if (editImages.length >= MAX_IMAGES) {
      Alert.alert("Limit reached", `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }
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
      setEditImages((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeEditImage = (index: number) =>
    setEditImages((prev) => prev.filter((_, i) => i !== index));

  const handleUpdate = async () => {
    if (!validId) return;
    if (!editName.trim()) return Alert.alert("Required", "Name is required.");
    if (!editBrand.trim()) return Alert.alert("Required", "Brand is required.");
    if (editDescription.trim().length < 10)
      return Alert.alert(
        "Required",
        "Description must be at least 10 characters.",
      );

    // Strict price validation — parseFloat("100abc") = 100 and
    // parseFloat("1,200") = 1 are both wrong for MXN prices.
    const rawPrice = editPrice.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(rawPrice))
      return Alert.alert(
        "Invalid",
        "Enter a valid price (numbers only, e.g. 1990 or 1990.00).",
      );
    const parsedPrice = Number(rawPrice);
    if (parsedPrice <= 0)
      return Alert.alert("Invalid", "Price must be greater than 0.");

    if (!editColor.trim()) return Alert.alert("Required", "Color is required.");

    // Canonical order + deduplication: SIZES.filter preserves the enum order
    // and prevents sending e.g. ["M", "S", "M"] if the user toggled rapidly.
    const uniqueEditSizes = SIZES.filter((s) => editSizes.includes(s));
    if (uniqueEditSizes.length === 0)
      return Alert.alert("Required", "Select at least one size.");

    const newLocalUris = editImages.filter((img) => !img.startsWith("http"));

    let uploadedUrls: string[] = [];
    if (newLocalUris.length > 0) {
      try {
        setUploading(true);
        uploadedUrls = await Promise.all(newLocalUris.map(uploadToCloudinary));
      } catch {
        Alert.alert("Upload failed", "Could not upload one or more images.");
        return;
      } finally {
        setUploading(false);
      }
    }

    // Walk editImages in order; consume uploadedUrls positionally.
    // Prevents the indexOf duplicate-URI bug where two identical local URIs
    // would both map to uploadedUrls[0].
    let nextLocal = 0;
    const finalImages = editImages.map((img) => {
      if (img.startsWith("http")) return img;
      return uploadedUrls[nextLocal++];
    });

    // normalizeColor trims and lowercases — matches the inventory pre-save hook
    // and the Zod validation schema so storage is always consistent.
    const normalizedColor = normalizeColor(editColor);

    updateProduct({
      variables: {
        id: validId,
        input: {
          name: editName.trim(),
          brand: editBrand.trim(),
          description: editDescription.trim(),
          price: parsedPrice,
          categoryGroup: editCategoryGroup.trim(),
          subcategory: editSubcategory.trim(),
          variants: uniqueEditSizes.map((size) => ({
            size,
            color: normalizedColor,
          })),
          images: finalImages,
          // Send current keyword list — server merges with auto-keywords
          // (subcategory, categoryGroup) and deduplicates before saving.
          searchKeywords: editKeywords,
        },
      },
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
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

  // ── Overflow menu (sticky header ⋯ + inline ⋯) ───────────────────────────
  const handleMoreMenu = () => {
    Alert.alert(product?.name ?? "Product", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete Product",
        style: "destructive",
        onPress: handleDelete,
      },
    ]);
  };

  // ── Add to Order shortcut ─────────────────────────────────────────────────
  // Passes productId so the orders screen can pre-select this product.
  // The orders screen needs to read this param to pre-fill — implement
  // that wiring when the order creation flow is built.
  const handleAddToOrder = () => {
    router.push({
      pathname: "/orders",
      params: { productId: validId ?? undefined },
    });
  };

  // ── Early returns — distinct states instead of one spinner ───────────────
  if (!validId) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.background,
          padding: 32,
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
            fontSize: 15,
            fontWeight: "600",
            color: C.textPrimary,
            marginBottom: 6,
          }}
        >
          Invalid product ID
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/inventory")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, color: C.accent }}>
            ← Back to Inventory
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (productLoading) {
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

  if (productError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.background,
          padding: 32,
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
            fontSize: 15,
            fontWeight: "600",
            color: C.textPrimary,
            marginBottom: 6,
          }}
        >
          Couldn't load product
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: C.textSecondary,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {productError.message}
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/inventory")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, color: C.accent }}>
            ← Back to Inventory
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!productData?.product) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.background,
          padding: 32,
        }}
      >
        <Ionicons
          name="cube-outline"
          size={40}
          color={C.textTertiary}
          style={{ marginBottom: 12 }}
        />
        <Text
          style={{
            fontSize: 15,
            fontWeight: "600",
            color: C.textPrimary,
            marginBottom: 6,
          }}
        >
          Product not found
        </Text>
        <Text
          style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16 }}
        >
          It may have been deleted.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/inventory")}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, color: C.accent }}>
            ← Back to Inventory
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const productImages = product?.images ?? [];
  const backAction = () =>
    router.canGoBack() ? router.back() : router.replace("/inventory");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* ── Sticky condensed header — fades in on scroll ─────────────── */}
      {/* Fixes: status bar bleed, context lost on scroll                  */}
      <StickyHeader
        productName={product?.name ?? productName ?? "Product"}
        opacity={stickyOpacity}
        insetTop={insets.top}
        onBack={backAction}
        onMore={handleMoreMenu}
        C={C}
      />

      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{
          paddingBottom: 60,
          paddingTop: insets.top,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* ── Page header ──────────────────────────────────────────────── */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 }}
        >
          {/* Back nav — always visible at top of scroll */}
          <TouchableOpacity
            onPress={backAction}
            activeOpacity={0.6}
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              marginBottom: 24,
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

          {/* Product name */}
          <Text
            numberOfLines={2}
            style={{
              fontSize: 22,
              fontWeight: "800",
              color: C.textPrimary,
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            {product?.name ?? productName ?? "Product"}
          </Text>

          {/* Brand + status badge inline */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>
              {product?.brand}
            </Text>
            {product?.status && <StatusBadge status={product.status} C={C} />}
          </View>
        </View>

        {/* ── Image carousel ───────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 4 }}>
          <ImageCarousel images={productImages} C={C} />
        </View>

        {/* ── Price hero card ───────────────────────────────────────────── */}
        {/* Fixes: price buried in flat info row — now first-class visual   */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: C.border,
              paddingVertical: 16,
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: C.textSecondary,
                }}
              >
                MXN
              </Text>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "800",
                  color: C.textPrimary,
                  letterSpacing: -1,
                }}
              >
                ${priceFormatter.format(product?.price ?? 0)}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>
              selling price
            </Text>
          </View>
        </View>

        {/* ── Primary CTA row ───────────────────────────────────────────── */}
        {/* Fixes: Delete had equal prominence to Edit                       */}
        {/* Edit is now the sole primary action. Delete is demoted to bottom. */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 20,
            marginBottom: 8,
            gap: 10,
          }}
        >
          <TouchableOpacity
            onPress={openEdit}
            activeOpacity={0.8}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: C.accent,
              borderRadius: 14,
              paddingVertical: 14,
            }}
          >
            <Ionicons
              name="pencil-outline"
              size={16}
              color={C.background}
              style={{ marginRight: 7 }}
            />
            <Text
              style={{ fontSize: 15, fontWeight: "700", color: C.background }}
            >
              Edit Product
            </Text>
          </TouchableOpacity>

          {/* ⋯ overflow — contains Delete to reduce mis-tap risk */}
          <TouchableOpacity
            onPress={handleMoreMenu}
            activeOpacity={0.8}
            style={{
              width: 48,
              borderRadius: 14,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={C.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* ── Product info ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
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
            Product Info
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
            <InfoRow label="Name" value={product?.name ?? "—"} C={C} />
            <InfoRow label="Brand" value={product?.brand ?? "—"} C={C} />
            <InfoRow
              label="Color"
              value={(() => {
                const c =
                  product?.variants.find(
                    (v) => v.color && v.color !== "default",
                  )?.color ?? "";
                return c ? c.charAt(0).toUpperCase() + c.slice(1) : "—";
              })()}
              C={C}
            />
            <InfoRow
              label="Category"
              value={product?.categoryGroup ?? "—"}
              C={C}
            />
            <InfoRow
              label="Subcategory"
              value={product?.subcategory ?? "—"}
              C={C}
              last
            />
          </View>
        </View>

        {/* ── Description ───────────────────────────────────────────────── */}
        {/* Fixes: full description text pushed Stock below the fold.         */}
        {/* 3-line clamp by default; "Show more" expands.                     */}
        {product?.description && (
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
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
              Description
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                padding: 16,
              }}
            >
              <Text
                numberOfLines={descriptionExpanded ? undefined : 3}
                style={{ fontSize: 13, color: C.textSecondary, lineHeight: 20 }}
              >
                {product.description}
              </Text>
              {product.description.length > 120 && (
                <TouchableOpacity
                  onPress={() => setDescriptionExpanded((v) => !v)}
                  activeOpacity={0.7}
                  style={{ marginTop: 8 }}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: "600", color: C.accent }}
                  >
                    {descriptionExpanded ? "Show less" : "Show more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Stock ─────────────────────────────────────────────────────── */}
        {/* Fixes: stock steppers live with no save mechanism.                */}
        {/* Default is read-only (progress bars). "Edit Stock" gates changes. */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
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
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: C.pending,
                    }}
                  >
                    {lowCount} low
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setStockEditMode((v) => !v)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: stockEditMode ? C.success : C.accent,
                }}
              >
                {stockEditMode ? "Done" : "Edit Stock"}
              </Text>
            </TouchableOpacity>
          </View>

          {inventoryError ? (
            <View
              style={{
                padding: 20,
                backgroundColor: C.alertBg,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.alert + "40",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: C.alert,
                  marginBottom: 4,
                }}
              >
                Couldn't load stock
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: C.textSecondary,
                  textAlign: "center",
                }}
              >
                {inventoryError.message}
              </Text>
            </View>
          ) : inventoryLoading ? (
            <View
              style={{
                padding: 20,
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="small" color={C.accent} />
            </View>
          ) : items.length === 0 ? (
            <View
              style={{
                padding: 20,
                backgroundColor: C.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, color: C.textTertiary }}>
                No sizes tracked yet — tap Edit Product to add sizes
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
              }}
            >
              {items.map((item, index) =>
                stockEditMode ? (
                  <EditableStockRow
                    key={
                      item.id ||
                      `${item.productId}-${variantKey(item.size, item.color)}`
                    }
                    item={item}
                    onAdd={() => handleAdd(item)}
                    onRemove={() => handleRemove(item)}
                    isLoading={isStockLoading}
                    isLast={index === items.length - 1}
                    C={C}
                  />
                ) : (
                  <ReadOnlyStockRow
                    key={
                      item.id ||
                      `${item.productId}-${variantKey(item.size, item.color)}`
                    }
                    item={item}
                    isLast={index === items.length - 1}
                    C={C}
                  />
                ),
              )}
            </View>
          )}
        </View>

        {/* ── Record info ───────────────────────────────────────────────── */}
        {/* Fixes: metadata rows visually identical to commercial rows.       */}
        {/* Created/Updated are smaller, muted — reference-only data.        */}
        {/* Fixes: "20 abr 2026" locale mismatch — now uses explicit en-US.  */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
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
            Record Info
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
            <InfoRow
              label="Created"
              value={product?.createdAt ? formatDate(product.createdAt) : "—"}
              muted
              C={C}
            />
            <InfoRow
              label="Last updated"
              value={product?.updatedAt ? formatDate(product.updatedAt) : "—"}
              muted
              last
              C={C}
            />
          </View>
        </View>

        {/* ── Delete — demoted to bottom text action ────────────────────── */}
        {/* Fixes: Delete had equal visual prominence to Edit (critical risk  */}
        {/* of accidental irreversible destructive action on small screen).   */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 40,
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, color: C.alert, fontWeight: "500" }}>
              {deleting ? "Deleting…" : "Delete product…"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      <Modal
        visible={editVisible}
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
            <EditImageGrid
              images={editImages}
              onAdd={pickEditImage}
              onRemove={removeEditImage}
              C={C}
            />
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
              label="Color"
              value={editColor}
              onChangeText={setEditColor}
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

            {/* ── Search Keywords ──────────────────────────────────────── */}
            {/* Optional aliases Luis uses to match this product when customers  */}
            {/* use colloquial terms. Auto-keywords (subcategory, categoryGroup)  */}
            {/* are always applied by the server — only add extras here.         */}
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
                Search Keywords
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <TextInput
                  value={keywordInput}
                  onChangeText={setKeywordInput}
                  placeholder="e.g. sweatshirt"
                  placeholderTextColor={C.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={() => {
                    const kw = keywordInput.trim().toLowerCase();
                    if (kw && !editKeywords.includes(kw)) {
                      setEditKeywords((prev) => [...prev, kw]);
                    }
                    setKeywordInput("");
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: C.background,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    color: C.textPrimary,
                    marginRight: 8,
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    const kw = keywordInput.trim().toLowerCase();
                    if (kw && !editKeywords.includes(kw)) {
                      setEditKeywords((prev) => [...prev, kw]);
                    }
                    setKeywordInput("");
                  }}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: C.accent,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: C.background,
                    }}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
              {editKeywords.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {editKeywords.map((kw) => (
                    <TouchableOpacity
                      key={kw}
                      onPress={() =>
                        setEditKeywords((prev) => prev.filter((k) => k !== kw))
                      }
                      activeOpacity={0.7}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: C.accentMuted,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        marginRight: 6,
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: C.accent,
                          marginRight: 4,
                        }}
                      >
                        {kw}
                      </Text>
                      <Ionicons name="close" size={12} color={C.accent} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text
                style={{ fontSize: 11, color: C.textTertiary, marginTop: 4 }}
              >
                Auto-keywords from subcategory and category are always applied
                by the server.
              </Text>
            </View>

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
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
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

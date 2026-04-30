import { type ThemeColors } from "@/constants/Colors";
import { ADD_STOCK } from "@/lib/graphql/mutations/inventory.mutations";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGES = 5;
const DESCRIPTION_MIN = 10;

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

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      slug
    }
  }
`;

// ─── Form types ───────────────────────────────────────────────────────────────

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type Size = (typeof SIZES)[number];

const GENDERS = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
] as const;
type Gender = "men" | "women";

type SizeStock = { size: Size; quantity: number };

type FormErrors = Partial<{
  name: string;
  brand: string;
  description: string;
  price: string;
  color: string; // Added
  categoryGroup: string;
  subcategory: string;
}>;

type FormFields = {
  name: string;
  brand: string;
  description: string;
  price: string;
  color: string; // Added
  categoryGroup: string;
  subcategory: string;
};

// ─── Category Map ─────────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, Record<string, string[]>> = {
  women: {
    Bottoms: ["Leggings", "Shorts", "Skirts", "Sport Pants", "Pants", "Capris"],
    Tops: [
      "Bras",
      "Tank Tops",
      "Short Sleeve Tops",
      "Long Sleeve Tops",
      "Crop Tops",
    ],
    Accessories: ["Socks & Sandals", "Caps", "Bags"],
    Outerwear: ["Sweatshirts & Hoodies", "Coats & Jackets"],
    Dresses: ["Dresses"],
  },
  men: {
    Bottoms: ["Shorts", "Pants", "Sport Pants"],
    Tops: ["Short Sleeve Tops", "Tank Tops", "Long Sleeve Tops"],
    Accessories: ["Caps & Hats", "Socks & Sandals"],
    Outerwear: ["Sweatshirts & Hoodies", "Jackets & Coats"],
  },
  general: {
    Footwear: ["Casual", "Sport"],
  },
};

// ─── Validation ───────────────────────────────────────────────────────────────

function validateFields(f: FormFields): FormErrors {
  const errs: FormErrors = {};
  if (!f.name.trim()) errs.name = "Product name is required";
  if (!f.brand.trim()) errs.brand = "Brand is required";
  if (f.description.trim().length < DESCRIPTION_MIN)
    errs.description = `Minimum ${DESCRIPTION_MIN} characters required`;
  if (!f.price.trim() || isNaN(parseFloat(f.price)) || parseFloat(f.price) < 0)
    errs.price = "Enter a valid price";
  // Color: required, letters/spaces/hyphens only, max 50 chars
  if (!f.color.trim()) errs.color = "Color is required";
  else if (f.color.trim().length > 50)
    errs.color = "Color must be at most 50 characters";
  if (!f.categoryGroup.trim())
    errs.categoryGroup = "Category group is required";
  if (!f.subcategory.trim()) errs.subcategory = "Subcategory is required";
  return errs;
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  multiline,
  keyboardType,
  required,
  error,
  prefix,
  showCounter,
  minLength,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: "default" | "decimal-pad";
  required?: boolean;
  error?: string;
  prefix?: string;
  showCounter?: boolean;
  minLength?: number;
  C: ThemeColors;
}) {
  const hasError = !!error;
  const charCount = value.trim().length;
  const counterMet = showCounter && minLength ? charCount >= minLength : false;

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
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
          {label}
        </Text>
        {required && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: C.alert,
              marginLeft: 3,
            }}
          >
            *
          </Text>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: multiline ? "flex-start" : "center",
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: hasError ? C.alert : C.border,
          borderRadius: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
        }}
      >
        {prefix && (
          <Text
            style={{
              fontSize: 15,
              color: C.textSecondary,
              marginRight: 4,
              lineHeight: 20,
            }}
          >
            {prefix}
          </Text>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={multiline}
          style={{
            flex: 1,
            fontSize: 15,
            color: C.textPrimary,
            textAlignVertical: multiline ? "top" : "center",
            minHeight: multiline ? 80 : undefined,
            padding: 0,
          }}
        />
      </View>

      {showCounter && minLength && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 5,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: counterMet ? C.success : C.textTertiary,
            }}
          >
            Min. {minLength} characters
          </Text>
          <Text
            style={{
              fontSize: 11,
              color: counterMet ? C.success : C.textTertiary,
            }}
          >
            {charCount} / {minLength}
          </Text>
        </View>
      )}

      {hasError && (
        <Text style={{ fontSize: 12, color: C.alert, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}

// ─── Searchable Select ────────────────────────────────────────────────────────

function SearchableSelect({
  label,
  value,
  onSelect,
  options,
  placeholder,
  disabled,
  required,
  error,
  onBlur,
  C,
}: {
  label: string;
  value: string;
  onSelect: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  onBlur?: () => void;
  C: ThemeColors;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value === "") setQuery("");
  }, [value]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase()),
  );
  const exactMatch = options.some(
    (o) => o.toLowerCase() === query.trim().toLowerCase(),
  );
  const showCustom = query.trim().length > 0 && !exactMatch;
  const showDropdown = open && !disabled && (filtered.length > 0 || showCustom);
  const hasError = !!error;

  const handleSelect = (v: string) => {
    setQuery(v);
    onSelect(v);
    setOpen(false);
  };
  const handleChangeText = (t: string) => {
    setQuery(t);
    onSelect(t);
    setOpen(true);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1,
            color: disabled ? C.textTertiary + "60" : C.textTertiary,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        {required && !disabled && (
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: C.alert,
              marginLeft: 3,
            }}
          >
            *
          </Text>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (!disabled) setOpen((p) => !p);
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: disabled ? C.surface + "80" : C.surface,
          borderWidth: 1,
          borderColor: hasError
            ? C.alert
            : open && !disabled
              ? C.accent
              : C.border,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 13,
        }}
      >
        <TextInput
          value={query}
          onChangeText={handleChangeText}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            onBlur?.();
          }}
          placeholder={disabled ? "Select a category group first" : placeholder}
          placeholderTextColor={C.textTertiary}
          editable={!disabled}
          autoCapitalize="words"
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 15,
            color: disabled ? C.textTertiary : C.textPrimary,
            padding: 0,
          }}
        />
        <Ionicons
          name={open && !disabled ? "chevron-up" : "chevron-down"}
          size={16}
          color={C.textTertiary}
        />
      </TouchableOpacity>

      {showDropdown && (
        <View
          style={{
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.accent,
            borderRadius: 12,
            marginTop: 4,
            overflow: "hidden",
          }}
        >
          {filtered.map((option, i) => (
            <TouchableOpacity
              key={option}
              onPress={() => handleSelect(option)}
              activeOpacity={0.7}
              style={{
                paddingVertical: 13,
                paddingHorizontal: 16,
                borderBottomWidth:
                  i < filtered.length - 1 || showCustom ? 1 : 0,
                borderBottomColor: C.border,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ flex: 1, fontSize: 15, color: C.textPrimary }}>
                {option}
              </Text>
              {option.toLowerCase() === query.trim().toLowerCase() && (
                <Ionicons name="checkmark" size={16} color={C.accent} />
              )}
            </TouchableOpacity>
          ))}
          {showCustom && (
            <TouchableOpacity
              onPress={() => handleSelect(query.trim())}
              activeOpacity={0.7}
              style={{
                paddingVertical: 13,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={C.accent}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ fontSize: 15, color: C.accent, fontWeight: "600" }}
              >
                Use &ldquo;{query.trim()}&rdquo;
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {hasError && (
        <Text style={{ fontSize: 12, color: C.alert, marginTop: 4 }}>
          {error}
        </Text>
      )}
    </View>
  );
}

// ─── Image Grid ───────────────────────────────────────────────────────────────

const TILE_SIZE = 72;
const TILE_GAP = 8;

function ImageGrid({
  images,
  onAdd,
  onRemove,
  C,
}: {
  images: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  C: ThemeColors;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 4 }}
      >
        {Array.from({ length: MAX_IMAGES }).map((_, index) => {
          const uri = images[index];
          const isFilled = !!uri;
          const isMain = index === 0;
          const isNextSlot = index === images.length;

          if (isFilled) {
            return (
              <View
                key={index}
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  marginRight: TILE_GAP,
                  borderRadius: 10,
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
                    top: 4,
                    right: 4,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "rgba(0,0,0,0.65)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={11} color="#fff" />
                </TouchableOpacity>
                {isMain && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 4,
                      left: 4,
                      backgroundColor: C.accent,
                      borderRadius: 4,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{ fontSize: 8, fontWeight: "700", color: "#fff" }}
                    >
                      MAIN
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={index}
              onPress={isNextSlot ? onAdd : undefined}
              activeOpacity={isNextSlot ? 0.8 : 1}
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                marginRight: index < MAX_IMAGES - 1 ? TILE_GAP : 0,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: isNextSlot ? C.accent : C.border + "50",
                borderStyle: "dashed",
                backgroundColor: C.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isNextSlot ? (
                <>
                  <Ionicons name="add" size={20} color={C.accent} />
                  {isMain && (
                    <Text
                      style={{
                        fontSize: 8,
                        color: C.accent,
                        marginTop: 3,
                        fontWeight: "700",
                        letterSpacing: 0.5,
                      }}
                    >
                      MAIN
                    </Text>
                  )}
                </>
              ) : (
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: C.border + "60",
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Add Product Screen ───────────────────────────────────────────────────────

export default function AddProductScreen() {
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  // Color: single value per product record. When the same product exists in
  // multiple colors, each color is a separate createProduct call — matching
  // the Model B architecture (one MongoDB document per product+color combination
  // until a full parent/variant UI is built).
  // The backend stores color lowercase on the variant; the Zod schema in
  // product.validation.ts applies .toLowerCase() so any casing works here.
  const [color, setColor] = useState("");
  const [gender, setGender] = useState<Gender>("women");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [sizeStocks, setSizeStocks] = useState<SizeStock[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const [touched, setTouched] = useState<
    Partial<Record<keyof FormErrors, boolean>>
  >({});

  const [createProduct, { loading: creating }] = useMutation<{
    createProduct: { id: string; name: string };
  }>(CREATE_PRODUCT);

  const [addStock] = useMutation(ADD_STOCK);

  const formErrors = validateFields({
    name,
    brand,
    description,
    price,
    color,
    categoryGroup,
    subcategory,
  });
  const visibleErrors = Object.fromEntries(
    Object.entries(formErrors).filter(([k]) => touched[k as keyof FormErrors]),
  ) as FormErrors;

  const markTouched = (field: keyof FormErrors) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const genderMap = gender === "men" ? CATEGORY_MAP.men : CATEGORY_MAP.women;
  const categoryGroups = Object.keys({ ...genderMap, ...CATEGORY_MAP.general });
  const fullMap = { ...genderMap, ...CATEGORY_MAP.general };
  const subcategoryOptions = categoryGroup
    ? (fullMap[categoryGroup] ?? [])
    : [];

  const handleGenderChange = (g: Gender) => {
    setGender(g);
    const newFull = {
      ...(g === "men" ? CATEGORY_MAP.men : CATEGORY_MAP.women),
      ...CATEGORY_MAP.general,
    };
    if (categoryGroup && !newFull[categoryGroup]) {
      setCategoryGroup("");
      setSubcategory("");
    }
  };

  const handleCategoryGroupSelect = (v: string) => {
    setCategoryGroup(v);
    setSubcategory("");
  };

  // ── Image picker ──────────────────────────────────────────────────────────

  const pickImage = async () => {
    if (imageUris.length >= MAX_IMAGES) {
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
      setImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) =>
    setImageUris((prev) => prev.filter((_, i) => i !== index));

  // ── Sizes ─────────────────────────────────────────────────────────────────

  const toggleSize = (size: Size) => {
    const exists = sizeStocks.find((s) => s.size === size);
    setSizeStocks(
      exists
        ? sizeStocks.filter((s) => s.size !== size)
        : [...sizeStocks, { size, quantity: 0 }],
    );
  };

  const isSizeSelected = (size: Size) =>
    sizeStocks.some((s) => s.size === size);

  const updateQty = (size: Size, delta: number) =>
    setSizeStocks(
      sizeStocks.map((s) =>
        s.size === size
          ? { ...s, quantity: Math.max(0, s.quantity + delta) }
          : s,
      ),
    );

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setTouched({
      name: true,
      brand: true,
      description: true,
      price: true,
      color: true,
      categoryGroup: true,
      subcategory: true,
    });

    const errs = validateFields({
      name,
      brand,
      description,
      price,
      color,
      categoryGroup,
      subcategory,
    });
    if (Object.keys(errs).length > 0) return;

    let images: string[] = [];
    if (imageUris.length > 0) {
      try {
        setUploading(true);
        images = await Promise.all(imageUris.map(uploadToCloudinary));
      } catch {
        Alert.alert(
          "Upload failed",
          "Could not upload one or more images. Please try again.",
        );
        return;
      } finally {
        setUploading(false);
      }
    }

    try {
      const { data } = await createProduct({
        variables: {
          input: {
            name: name.trim(),
            brand: brand.trim(),
            description: description.trim(),
            price: parseFloat(price),
            gender,
            categoryGroup: categoryGroup.trim(),
            subcategory: subcategory.trim(),
            // Color is applied to every variant. The backend validation schema
            // applies .toLowerCase() on the color field, matching what the
            // inventory pre-save hook expects for consistent querying.
            variants: sizeStocks.map(({ size }) => ({
              size,
              color: color.trim(),
            })),
            images,
            status: "active",
            searchKeywords: keywords,
          },
        },
      });

      const productId = data?.createProduct.id;
      const productName = data?.createProduct.name ?? name;

      if (productId) {
        const stockOps = sizeStocks.filter((s) => s.quantity > 0);
        await Promise.all(
          stockOps.map((s) =>
            addStock({
              variables: {
                input: {
                  productId,
                  size: s.size,
                  color: color.trim(),
                  quantity: s.quantity,
                },
              },
            }),
          ),
        );
        router.replace({
          pathname: "/inventory/[productId]",
          params: { productId, productName },
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Error", message);
    }
  };

  const isSubmitting = uploading || creating;

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <View
            style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 }}
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
                Inventory
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
              Add Product
            </Text>
            <Text
              style={{ fontSize: 13, color: C.textSecondary, marginTop: 4 }}
            >
              Fill in the details to add a new product
            </Text>
            <Text
              style={{ fontSize: 11, color: C.textTertiary, marginTop: 10 }}
            >
              <Text style={{ color: C.alert }}>*</Text> Required fields
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* ── Images ─────────────────────────────────────────────── */}
            <ImageGrid
              images={imageUris}
              onAdd={pickImage}
              onRemove={removeImage}
              C={C}
            />

            {/* ── Basic Info ─────────────────────────────────────────── */}
            <Field
              label="Product Name"
              value={name}
              onChangeText={setName}
              onBlur={() => markTouched("name")}
              placeholder="e.g. Align Legging"
              required
              error={visibleErrors.name}
              C={C}
            />
            <Field
              label="Brand"
              value={brand}
              onChangeText={setBrand}
              onBlur={() => markTouched("brand")}
              placeholder="e.g. Lululemon"
              required
              error={visibleErrors.brand}
              C={C}
            />
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              onBlur={() => markTouched("description")}
              placeholder="Write a short product description…"
              multiline
              required
              showCounter
              minLength={DESCRIPTION_MIN}
              error={visibleErrors.description}
              C={C}
            />
            <Field
              label="Price"
              value={price}
              onChangeText={setPrice}
              onBlur={() => markTouched("price")}
              placeholder="e.g. 1,990"
              keyboardType="decimal-pad"
              prefix="MXN $"
              required
              error={visibleErrors.price}
              C={C}
            />

            {/* ── Color ──────────────────────────────────────────────── */}
            {/* One color per product record. To add a second color, create     */}
            {/* a new product with the same name and a different color value.   */}
            {/* The backend stores it lowercase; display capitalization happens */}
            {/* in searchProductsForClaude before sending to the bot.           */}
            <Field
              label="Color"
              value={color}
              onChangeText={setColor}
              onBlur={() => markTouched("color")}
              placeholder="e.g. Negro, Blanco, Beige, Burgundy"
              required
              error={visibleErrors.color}
              C={C}
            />

            {/* ── Gender ─────────────────────────────────────────────── */}
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
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
                  Gender
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: C.alert,
                    marginLeft: 3,
                  }}
                >
                  *
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {GENDERS.map((g) => {
                  const selected = gender === g.value;
                  return (
                    <TouchableOpacity
                      key={g.value}
                      onPress={() => handleGenderChange(g.value)}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: selected ? C.accentMuted : C.surface,
                        borderWidth: 1,
                        borderColor: selected ? C.accent : C.border,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {selected && (
                        <Ionicons name="checkmark" size={14} color={C.accent} />
                      )}
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: selected ? C.accent : C.textSecondary,
                        }}
                      >
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ── Category ───────────────────────────────────────────── */}
            <SearchableSelect
              label="Category Group"
              value={categoryGroup}
              onSelect={handleCategoryGroupSelect}
              onBlur={() => markTouched("categoryGroup")}
              options={categoryGroups}
              placeholder="e.g. Tops"
              required
              error={visibleErrors.categoryGroup}
              C={C}
            />
            <SearchableSelect
              label="Subcategory"
              value={subcategory}
              onSelect={setSubcategory}
              onBlur={() => markTouched("subcategory")}
              options={subcategoryOptions}
              placeholder="e.g. Crop Tops"
              disabled={!categoryGroup.trim()}
              required
              error={visibleErrors.subcategory}
              C={C}
            />

            {/* ── Search Keywords ─────────────────────────────────────── */}
            {/* Optional aliases for Luis to match this product when customers  */}
            {/* use colloquial terms. Auto-keywords from subcategory and         */}
            {/* categoryGroup are always applied by the server on save.          */}
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
                Search Keywords{" "}
                <Text
                  style={{
                    color: C.textTertiary,
                    fontWeight: "400",
                    letterSpacing: 0,
                  }}
                >
                  (optional)
                </Text>
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                    marginRight: 8,
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
                      if (kw && !keywords.includes(kw)) {
                        setKeywords((prev) => [...prev, kw]);
                      }
                      setKeywordInput("");
                    }}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: C.textPrimary,
                      padding: 0,
                    }}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => {
                    const kw = keywordInput.trim().toLowerCase();
                    if (kw && !keywords.includes(kw)) {
                      setKeywords((prev) => [...prev, kw]);
                    }
                    setKeywordInput("");
                  }}
                  activeOpacity={0.7}
                  style={{
                    backgroundColor: C.accent,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 13,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: C.background,
                    }}
                  >
                    Add
                  </Text>
                </TouchableOpacity>
              </View>
              {keywords.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginBottom: 4,
                  }}
                >
                  {keywords.map((kw) => (
                    <TouchableOpacity
                      key={kw}
                      onPress={() =>
                        setKeywords((prev) => prev.filter((k) => k !== kw))
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
              <Text style={{ fontSize: 11, color: C.textTertiary }}>
                Subcategory and category group are auto-applied by the server.
              </Text>
            </View>
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1,
                      color: C.textTertiary,
                      textTransform: "uppercase",
                    }}
                  >
                    Available Sizes
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: C.alert,
                      marginLeft: 3,
                    }}
                  >
                    *
                  </Text>
                </View>
                {sizeStocks.length === 0 && (
                  <Text style={{ fontSize: 11, color: C.textTertiary }}>
                    Tap to select
                  </Text>
                )}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: sizeStocks.length > 0 ? 12 : 0,
                }}
              >
                {SIZES.map((s) => {
                  const selected = isSizeSelected(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => toggleSize(s)}
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

              {sizeStocks.length > 0 && (
                <>
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
                    Initial Stock
                  </Text>
                  <View
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: C.border,
                      overflow: "hidden",
                    }}
                  >
                    {sizeStocks.map((s, i) => (
                      <View
                        key={s.size}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          borderBottomWidth: i < sizeStocks.length - 1 ? 1 : 0,
                          borderBottomColor: C.border,
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            fontSize: 15,
                            fontWeight: "600",
                            color: C.textPrimary,
                          }}
                        >
                          {s.size}
                        </Text>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <TouchableOpacity
                            onPress={() => updateQty(s.size, -1)}
                            activeOpacity={0.7}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              borderWidth: 1,
                              borderColor: C.border,
                              backgroundColor: C.background,
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: s.quantity === 0 ? 0.35 : 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 16,
                                color: C.textPrimary,
                                lineHeight: 20,
                              }}
                            >
                              −
                            </Text>
                          </TouchableOpacity>
                          <Text
                            style={{
                              width: 36,
                              textAlign: "center",
                              fontSize: 15,
                              fontWeight: "700",
                              color: s.quantity > 0 ? C.accent : C.textTertiary,
                            }}
                          >
                            {s.quantity}
                          </Text>
                          <TouchableOpacity
                            onPress={() => updateQty(s.size, 1)}
                            activeOpacity={0.7}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 15,
                              backgroundColor: C.accent,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 16,
                                color: C.background,
                                lineHeight: 20,
                              }}
                            >
                              +
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>

            {/* ── Submit ─────────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
              style={{
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 8,
                opacity: isSubmitting ? 0.7 : 1,
                flexDirection: "row",
                justifyContent: "center",
              }}
            >
              {isSubmitting && (
                <ActivityIndicator
                  size="small"
                  color={C.background}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: C.background }}
              >
                {uploading
                  ? "Uploading images…"
                  : creating
                    ? "Creating…"
                    : "Create Product"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

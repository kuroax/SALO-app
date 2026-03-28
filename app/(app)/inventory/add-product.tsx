import { type ThemeColors } from "@/constants/Colors";
import { ADD_STOCK } from "@/lib/graphql/mutations/inventory.mutations";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
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

const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      slug
    }
  }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type Size = (typeof SIZES)[number];
const GENDERS = [
  { value: "men", label: "Men" },
  { value: "women", label: "Women" },
] as const;
type Gender = "men" | "women";

const DEFAULT_COLOR = "default";

type SizeStock = { size: Size; quantity: number };

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
  keyboardType?: "default" | "decimal-pad";
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
        multiline={multiline}
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
          fontSize: 15,
          color: C.textPrimary,
          textAlignVertical: multiline ? "top" : "center",
          minHeight: multiline ? 100 : undefined,
        }}
      />
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
  const [gender, setGender] = useState<Gender>("men");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [sizeStocks, setSizeStocks] = useState<SizeStock[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [createProduct, { loading: creating }] = useMutation<{
    createProduct: { id: string; name: string };
  }>(CREATE_PRODUCT);

  const [addStock] = useMutation(ADD_STOCK);

  // ── Image picker ──────────────────────────────────────────────────────────

  const pickImage = async () => {
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
      setImageUri(result.assets[0].uri);
    }
  };

  // ── Size toggle ───────────────────────────────────────────────────────────

  const toggleSize = (size: Size) => {
    const exists = sizeStocks.find((s) => s.size === size);
    if (exists) {
      setSizeStocks(sizeStocks.filter((s) => s.size !== size));
    } else {
      setSizeStocks([...sizeStocks, { size, quantity: 0 }]);
    }
  };

  const isSizeSelected = (size: Size) =>
    sizeStocks.some((s) => s.size === size);

  const updateQty = (size: Size, delta: number) => {
    setSizeStocks(
      sizeStocks.map((s) =>
        s.size === size
          ? { ...s, quantity: Math.max(0, s.quantity + delta) }
          : s,
      ),
    );
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!name.trim())
      return Alert.alert("Required", "Product name is required.");
    if (!brand.trim()) return Alert.alert("Required", "Brand is required.");
    if (description.trim().length < 10)
      return Alert.alert(
        "Required",
        "Description must be at least 10 characters.",
      );
    if (!price.trim() || isNaN(parseFloat(price)) || parseFloat(price) < 0)
      return Alert.alert("Invalid", "Enter a valid price.");
    if (!categoryGroup.trim())
      return Alert.alert("Required", "Category group is required.");
    if (!subcategory.trim())
      return Alert.alert("Required", "Subcategory is required.");

    let images: string[] = [];
    if (imageUri) {
      try {
        setUploading(true);
        images = [await uploadToCloudinary(imageUri)];
      } catch {
        Alert.alert(
          "Upload failed",
          "Could not upload image. Please try again.",
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
            variants: sizeStocks.map(({ size }) => ({
              size,
              color: DEFAULT_COLOR,
            })),
            images,
            status: "active",
          },
        },
      });

      const productId = data?.createProduct.id;
      const productName = data?.createProduct.name ?? name;

      // Add initial stock for each size that has quantity > 0
      if (productId) {
        const stockOps = sizeStocks.filter((s) => s.quantity > 0);
        await Promise.all(
          stockOps.map((s) =>
            addStock({
              variables: {
                input: {
                  productId,
                  size: s.size,
                  color: DEFAULT_COLOR,
                  quantity: s.quantity,
                },
              },
            }),
          ),
        );
      }

      Alert.alert(
        "Product created",
        `"${productName}" was added to inventory.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      Alert.alert("Error", msg);
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
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* ── Header ──────────────────────────────────────────────── */}
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
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* ── Image picker ──────────────────────────────────────── */}
            <View style={{ marginBottom: 24 }}>
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
                Product Image
              </Text>
              <TouchableOpacity
                onPress={pickImage}
                activeOpacity={0.8}
                style={{
                  height: 160,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: imageUri ? C.accent : C.border,
                  borderStyle: imageUri ? "solid" : "dashed",
                  backgroundColor: C.surface,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {imageUri ? (
                  <>
                    <Image
                      source={{ uri: imageUri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <View
                      style={{
                        position: "absolute",
                        bottom: 10,
                        right: 10,
                        backgroundColor: C.accent,
                        borderRadius: 20,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons
                        name="pencil"
                        size={12}
                        color="#fff"
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: "#fff",
                        }}
                      >
                        Change
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        backgroundColor: C.accentMuted,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10,
                      }}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={24}
                        color={C.accent}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: C.textPrimary,
                      }}
                    >
                      Upload Photo
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: C.textTertiary,
                        marginTop: 3,
                      }}
                    >
                      Tap to select from library
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Basic info ────────────────────────────────────────── */}
            <Field
              label="Product Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Black Hoodie"
              C={C}
            />
            <Field
              label="Brand"
              value={brand}
              onChangeText={setBrand}
              placeholder="e.g. Nike"
              C={C}
            />
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Min. 10 characters…"
              multiline
              C={C}
            />
            <Field
              label="Price (MXN)"
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
              C={C}
            />

            {/* ── Gender ────────────────────────────────────────────── */}
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
                Gender
              </Text>
              <View style={{ flexDirection: "row" }}>
                {GENDERS.map((g, i) => {
                  const selected = gender === g.value;
                  return (
                    <TouchableOpacity
                      key={g.value}
                      onPress={() => setGender(g.value)}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 10,
                        backgroundColor: selected ? C.accentMuted : C.surface,
                        borderWidth: 1,
                        borderColor: selected ? C.accent : C.border,
                        alignItems: "center",
                        marginRight: i === 0 ? 8 : 0,
                      }}
                    >
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

            {/* ── Category ────────────────────────────────────────────── */}
            <Field
              label="Category Group"
              value={categoryGroup}
              onChangeText={setCategoryGroup}
              placeholder="e.g. Tops"
              C={C}
            />
            <Field
              label="Subcategory"
              value={subcategory}
              onChangeText={setSubcategory}
              placeholder="e.g. Hoodies"
              C={C}
            />

            {/* ── Sizes & Stock ────────────────────────────────────── */}
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
                Available Sizes
              </Text>

              {/* Size chips */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 12,
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

              {/* Stock per selected size */}
              {sizeStocks.length === 0 ? (
                <View
                  style={{
                    padding: 16,
                    backgroundColor: C.surface,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.border,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, color: C.textTertiary }}>
                    Tap sizes above to add them
                  </Text>
                </View>
              ) : (
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
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
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
                                color: "#fff",
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

            {/* ── Submit ────────────────────────────────────────────── */}
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
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: scheme === "dark" ? "#0c0c0c" : "#ffffff",
                }}
              >
                {uploading
                  ? "Uploading image…"
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

import { type ThemeColors } from "@/constants/Colors";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        numberOfLines={multiline ? 4 : 1}
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

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [gender, setGender] = useState<Gender>("men");
  const [categoryGroup, setCategoryGroup] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [variants, setVariants] = useState<{ size: Size; color: string }[]>([]);
  const [newSize, setNewSize] = useState<Size>("M");
  const [newColor, setNewColor] = useState("");

  const [createProduct, { loading }] = useMutation<{
    createProduct: { name: string };
  }>(CREATE_PRODUCT, {
    onCompleted: (data) => {
      Alert.alert(
        "Product created",
        `"${data.createProduct.name}" was added to inventory.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  // ── Variant management ───────────────────────────────────────────────────────

  const addVariant = () => {
    const color = newColor.trim().toLowerCase();
    if (!color) {
      Alert.alert("Required", "Enter a color for the variant.");
      return;
    }
    const exists = variants.some(
      (v) => v.size === newSize && v.color === color,
    );
    if (exists) {
      Alert.alert("Duplicate", `${newSize} · ${color} already added.`);
      return;
    }
    setVariants([...variants, { size: newSize, color }]);
    setNewColor("");
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
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

    createProduct({
      variables: {
        input: {
          name: name.trim(),
          brand: brand.trim(),
          description: description.trim(),
          price: parseFloat(price),
          gender,
          categoryGroup: categoryGroup.trim(),
          subcategory: subcategory.trim(),
          variants,
          status: "active",
        },
      },
    });
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
        <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
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
            {/* ── Basic info ──────────────────────────────────────────── */}
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
              placeholder="e.g. Alo"
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
              placeholder="e.g. Tank Tops"
              C={C}
            />

            {/* ── Variants ────────────────────────────────────────────── */}
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
                Variants
              </Text>

              {/* Size picker */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}
              >
                {SIZES.map((s) => {
                  const selected = newSize === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setNewSize(s)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: selected ? C.accentMuted : C.surface,
                        borderWidth: 1,
                        borderColor: selected ? C.accent : C.border,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: selected ? C.accent : C.textSecondary,
                        }}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Color input + add */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <TextInput
                  value={newColor}
                  onChangeText={setNewColor}
                  placeholder="Color (e.g. negro)"
                  placeholderTextColor={C.textTertiary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    backgroundColor: C.surface,
                    borderWidth: 1,
                    borderColor: C.border,
                    borderRadius: 10,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    fontSize: 14,
                    color: C.textPrimary,
                    marginRight: 10,
                  }}
                />
                <TouchableOpacity
                  onPress={addVariant}
                  activeOpacity={0.7}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: C.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Variant list */}
              {variants.length === 0 ? (
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
                    No variants added yet
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
                  {variants.map((v, i) => (
                    <View
                      key={`${v.size}-${v.color}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                        borderBottomWidth: i < variants.length - 1 ? 1 : 0,
                        borderBottomColor: C.border,
                      }}
                    >
                      <Text
                        style={{ flex: 1, fontSize: 14, color: C.textPrimary }}
                      >
                        {v.size} · {v.color}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeVariant(i)}
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
                </View>
              )}
            </View>

            {/* ── Submit ────────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
              style={{
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 8,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: scheme === "dark" ? "#0c0c0c" : "#ffffff",
                }}
              >
                {loading ? "Creating…" : "Create Product"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

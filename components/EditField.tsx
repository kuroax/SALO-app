import { useColors } from "@/lib/hooks/useColors";
import { Text, TextInput, View } from "react-native";

type KeyboardType =
  | "default"
  | "decimal-pad"
  | "numeric"
  | "phone-pad"
  | "email-address"
  | "url";

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardType;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  /** Extra margin below the field. Default: 14 */
  marginBottom?: number;
  /** Optional helper text shown below the input */
  hint?: string;
  multiline?: boolean;
  numberOfLines?: number;
};

/**
 * EditField
 * Labelled TextInput for forms and edit modals.
 * Replaces the local `Field` component scattered across screens.
 *
 * Usage:
 *   <EditField
 *     label="Full Name"
 *     value={name}
 *     onChangeText={setName}
 *     placeholder="Ana López"
 *   />
 *   <EditField
 *     label="Price (MXN)"
 *     value={price}
 *     onChangeText={setPrice}
 *     keyboardType="decimal-pad"
 *     hint="Base price before discounts"
 *   />
 */
export function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
  autoCorrect = false,
  secureTextEntry = false,
  editable = true,
  marginBottom = 14,
  hint,
  multiline = false,
  numberOfLines,
}: Props) {
  const C = useColors();

  return (
    <View style={{ marginBottom }}>
      {/* Label */}
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

      {/* Input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        secureTextEntry={secureTextEntry}
        editable={editable}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{
          backgroundColor: editable ? C.surface : C.background,
          borderWidth: 1,
          borderColor: editable ? C.border : C.border,
          borderRadius: 10,
          paddingVertical: 11,
          paddingHorizontal: 14,
          fontSize: 14,
          color: editable ? C.textPrimary : C.textSecondary,
          opacity: editable ? 1 : 0.6,
          ...(multiline ? { minHeight: 80, textAlignVertical: "top" } : {}),
        }}
      />

      {/* Hint */}
      {hint ? (
        <Text
          style={{
            fontSize: 11,
            color: C.textTertiary,
            marginTop: 4,
            lineHeight: 16,
          }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

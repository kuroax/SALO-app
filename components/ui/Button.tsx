import { useColors } from "@/lib/hooks/useColors";
import type { ThemeColors } from "@/constants/Colors";
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    type TouchableOpacityProps,
    type ViewStyle,
    type TextStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

// children is string — this button renders text labels only.
// For icon+label or icon-only buttons, use IconButton (future component).
type ButtonProps = Omit<TouchableOpacityProps, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: string;
};

// ─── Style helpers ────────────────────────────────────────────────────────────

function containerStyle(variant: ButtonVariant, C: ThemeColors): ViewStyle {
  switch (variant) {
    case "primary":
      return { backgroundColor: C.accent, borderWidth: 1, borderColor: C.accent };
    case "secondary":
      return { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border };
    case "danger":
      return { backgroundColor: C.alertBg, borderWidth: 1, borderColor: C.alert + "40" };
    case "ghost":
      return { backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent" };
  }
}

function labelColor(variant: ButtonVariant, C: ThemeColors): string {
  switch (variant) {
    case "primary":   return C.background;
    case "secondary": return C.textPrimary;
    case "danger":    return C.alert;
    case "ghost":     return C.textSecondary;
  }
}

const sizeStyleMap: Record<ButtonSize, { container: ViewStyle; label: TextStyle }> = {
  sm: {
    container: { paddingHorizontal: 16, paddingVertical: 8,  borderRadius: 12 },
    label:     { fontSize: 14, fontWeight: "600" },
  },
  md: {
    container: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16 },
    label:     { fontSize: 16, fontWeight: "600" },
  },
  lg: {
    container: { paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16 },
    label:     { fontSize: 18, fontWeight: "600" },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  onPress,
  onPressIn: consumerPressIn,
  onPressOut: consumerPressOut,
  children,
  ...rest
}: ButtonProps) {
  const C = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  const handlePressIn: NonNullable<TouchableOpacityProps["onPressIn"]> = (e) => {
    if (!isDisabled) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    }
    consumerPressIn?.(e);
  };

  const handlePressOut: NonNullable<TouchableOpacityProps["onPressOut"]> = (e) => {
    if (!isDisabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
    consumerPressOut?.(e);
  };

  return (
    <Animated.View style={[animatedStyle, fullWidth && { width: "100%" }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          { alignItems: "center", justifyContent: "center", flexDirection: "row" },
          containerStyle(variant, C),
          sizeStyleMap[size].container,
          isDisabled && { opacity: 0.5 },
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator size="small" color={labelColor(variant, C)} />
        ) : (
          <Text style={[sizeStyleMap[size].label, { color: labelColor(variant, C) }]}>
            {children}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

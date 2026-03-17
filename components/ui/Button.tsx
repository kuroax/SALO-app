import {
    ActivityIndicator,
    Pressable,
    Text,
    type PressableProps,
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
type ButtonProps = Omit<PressableProps, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children: string;
};

// ─── Style maps ───────────────────────────────────────────────────────────────

const containerStyles: Record<ButtonVariant, string> = {
  primary: "bg-gray-900 border border-gray-900",
  secondary: "bg-white border border-gray-300",
  danger: "bg-red-50 border border-red-200",
  ghost: "bg-transparent border border-transparent",
};

const labelStyles: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-gray-900",
  danger: "text-red-600",
  ghost: "text-gray-600",
};

const indicatorColors: Record<ButtonVariant, string> = {
  primary: "#ffffff",
  secondary: "#111827",
  danger: "#dc2626",
  ghost: "#4b5563",
};

const sizeStyles: Record<ButtonSize, { container: string; label: string }> = {
  sm: { container: "px-4 py-2 rounded-xl", label: "text-sm font-semibold" },
  md: {
    container: "px-5 py-3.5 rounded-2xl",
    label: "text-base font-semibold",
  },
  lg: { container: "px-6 py-4 rounded-2xl", label: "text-lg font-semibold" },
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
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  // Internal handlers compose with consumer-provided handlers.
  // Animation is skipped when disabled or loading.
  const handlePressIn = (
    e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0],
  ) => {
    if (!isDisabled) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    }
    consumerPressIn?.(e);
  };

  const handlePressOut = (
    e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0],
  ) => {
    if (!isDisabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
    consumerPressOut?.(e);
  };

  return (
    <Animated.View style={[animatedStyle, fullWidth && { width: "100%" }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        className={[
          "items-center justify-center flex-row",
          containerStyles[variant],
          sizeStyles[size].container,
          isDisabled ? "opacity-50" : "opacity-100",
        ].join(" ")}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator size="small" color={indicatorColors[variant]} />
        ) : (
          <Text
            className={[sizeStyles[size].label, labelStyles[variant]].join(" ")}
          >
            {children}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

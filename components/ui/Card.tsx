import {
    Pressable,
    View,
    type PressableProps,
    type StyleProp,
    type ViewProps,
    type ViewStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

// ─── Types ────────────────────────────────────────────────────────────────────

type CardVariant = "white" | "gray";
type CardPadding = "none" | "sm" | "md" | "lg";

type BaseCardProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  children: React.ReactNode;
  className?: string;
  // Explicitly typed as ViewStyle to avoid PressableProps style conflict.
  style?: StyleProp<ViewStyle>;
};

// Discriminated union — static card accepts ViewProps,
// interactive card accepts PressableProps.
type StaticCardProps = BaseCardProps &
  Omit<ViewProps, "style"> & {
    onPress?: undefined;
  };

type InteractiveCardProps = BaseCardProps &
  Omit<PressableProps, "children" | "style"> & {
    onPress: NonNullable<PressableProps["onPress"]>;
  };

type CardProps = StaticCardProps | InteractiveCardProps;

// ─── Style maps ───────────────────────────────────────────────────────────────

const variantStyles: Record<CardVariant, string> = {
  white: "bg-white border border-gray-100",
  gray: "bg-gray-50 border border-gray-200",
};

const paddingStyles: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

// Shadow applied via style prop — NativeWind shadow utilities
// do not map cleanly to RN shadow props on all versions.
// Two-View pattern on static card prevents overflow-hidden from
// clipping the shadow on iOS.
const shadowStyle = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Card({
  variant = "white",
  padding = "md",
  children,
  style,
  className = "",
  ...rest
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerClassName = [
    "rounded-2xl overflow-hidden",
    variantStyles[variant],
    paddingStyles[padding],
    className,
  ].join(" ");

  // ── Tappable card ──────────────────────────────────────────────────────────
  if ("onPress" in rest && rest.onPress) {
    const {
      onPressIn: consumerPressIn,
      onPressOut: consumerPressOut,
      ...pressableProps
    } = rest as InteractiveCardProps;

    const handlePressIn = (
      e: Parameters<NonNullable<PressableProps["onPressIn"]>>[0],
    ) => {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      consumerPressIn?.(e);
    };

    const handlePressOut = (
      e: Parameters<NonNullable<PressableProps["onPressOut"]>>[0],
    ) => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      consumerPressOut?.(e);
    };

    return (
      <Animated.View style={[shadowStyle, animatedStyle, style as ViewStyle]}>
        <Pressable
          {...pressableProps}
          className={containerClassName}
          accessibilityRole="button"
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  // ── Static card ────────────────────────────────────────────────────────────
  // Two-View pattern: outer View holds shadow, inner View holds
  // border-radius + overflow-hidden so shadow is not clipped on iOS.
  return (
    <View style={[shadowStyle, style as ViewStyle]}>
      <View className={containerClassName}>{children}</View>
    </View>
  );
}

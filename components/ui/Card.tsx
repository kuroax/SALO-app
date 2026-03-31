import { useColors } from "@/lib/hooks/useColors";
import type { ThemeColors } from "@/constants/Colors";
import {
    TouchableOpacity,
    View,
    type StyleProp,
    type TouchableOpacityProps,
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
  // Explicitly typed as ViewStyle to avoid TouchableOpacityProps style conflict.
  style?: StyleProp<ViewStyle>;
};

// Discriminated union — static card accepts ViewProps,
// interactive card accepts TouchableOpacityProps.
type StaticCardProps = BaseCardProps &
  Omit<ViewProps, "style"> & {
    onPress?: undefined;
  };

type InteractiveCardProps = BaseCardProps &
  Omit<TouchableOpacityProps, "children" | "style"> & {
    onPress: NonNullable<TouchableOpacityProps["onPress"]>;
  };

type CardProps = StaticCardProps | InteractiveCardProps;

// ─── Style helpers ────────────────────────────────────────────────────────────

function variantStyleFn(variant: CardVariant, C: ThemeColors): ViewStyle {
  switch (variant) {
    case "white":
      return { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border };
    case "gray":
      return { backgroundColor: C.background, borderWidth: 1, borderColor: C.border };
  }
}

const paddingStyleMap: Record<CardPadding, ViewStyle> = {
  none: {},
  sm:   { padding: 12 },
  md:   { padding: 16 },
  lg:   { padding: 20 },
};

// Shadow applied via style prop.
// Two-View pattern on static card prevents overflow-hidden from
// clipping the shadow on iOS.
const shadowStyle: ViewStyle = {
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
  ...rest
}: CardProps) {
  const C = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const innerStyle: ViewStyle = {
    borderRadius: 16,
    overflow: "hidden",
    ...variantStyleFn(variant, C),
    ...paddingStyleMap[padding],
  };

  // ── Tappable card ──────────────────────────────────────────────────────────
  if ("onPress" in rest && rest.onPress) {
    const {
      onPressIn: consumerPressIn,
      onPressOut: consumerPressOut,
      ...tappableProps
    } = rest as InteractiveCardProps;

    const handlePressIn: NonNullable<TouchableOpacityProps["onPressIn"]> = (e) => {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
      consumerPressIn?.(e);
    };

    const handlePressOut: NonNullable<TouchableOpacityProps["onPressOut"]> = (e) => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      consumerPressOut?.(e);
    };

    return (
      <Animated.View style={[shadowStyle, animatedStyle, style as ViewStyle]}>
        <TouchableOpacity
          {...tappableProps}
          activeOpacity={0.7}
          accessibilityRole="button"
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={innerStyle}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── Static card ────────────────────────────────────────────────────────────
  // Two-View pattern: outer View holds shadow, inner View holds
  // border-radius + overflow-hidden so shadow is not clipped on iOS.
  return (
    <View style={[shadowStyle, style as ViewStyle]}>
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

import { useColors } from "@/lib/hooks/useColors";
import { forwardRef, useEffect, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

// ─── Types ────────────────────────────────────────────────────────────────────

// placeholder is omitted — the floating label serves that role.
// Showing both simultaneously would be visually broken.
type InputProps = Omit<TextInputProps, "placeholder"> & {
  label: string;
  error?: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      value,
      onFocus: consumerFocus,
      onBlur: consumerBlur,
      onChangeText,
      ...rest
    },
    ref,
  ) => {
    const C = useColors();
    const [isFocused, setIsFocused] = useState(false);

    // 0 = resting, 1 = active (focused or has value)
    const labelProgress = useSharedValue(value ? 1 : 0);
    const borderProgress = useSharedValue(0);

    const hasError = !!error;
    const isActive = isFocused || !!value;

    // useEffect handles programmatic value changes (autofill, form reset)
    // that bypass user interaction handlers.
    useEffect(() => {
      labelProgress.value = withTiming(isActive ? 1 : 0, { duration: 150 });
    }, [isActive, labelProgress]);

    useEffect(() => {
      borderProgress.value = withTiming(isFocused ? 1 : 0, { duration: 150 });
    }, [isFocused, borderProgress]);

    // Floating label — translates up and scales down when active.
    const labelAnimatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: interpolate(labelProgress.value, [0, 1], [0, -26]) },
        { scale: interpolate(labelProgress.value, [0, 1], [1, 0.78]) },
      ],
    }));

    // Label color: always error color when invalid, otherwise tertiary → primary on focus.
    const labelColorStyle = useAnimatedStyle(() => ({
      color: hasError
        ? C.alert
        : interpolateColor(
            borderProgress.value,
            [0, 1],
            [C.textTertiary, C.textPrimary],
          ),
    }));

    // Border color: muted error when invalid, otherwise border → primary on focus.
    const borderColorStyle = useAnimatedStyle(() => ({
      borderColor: hasError
        ? C.alert + "80"
        : interpolateColor(
            borderProgress.value,
            [0, 1],
            [C.border, C.textPrimary],
          ),
    }));

    // Handlers trigger state changes — useEffect drives animations.
    const handleFocus: NonNullable<TextInputProps["onFocus"]> = (e) => {
      setIsFocused(true);
      consumerFocus?.(e);
    };

    const handleBlur: NonNullable<TextInputProps["onBlur"]> = (e) => {
      setIsFocused(false);
      consumerBlur?.(e);
    };

    return (
      <View style={{ width: "100%" }}>
        <Animated.View
          style={[
            borderColorStyle,
            {
              position: "relative",
              borderRadius: 16,
              borderWidth: 1,
              backgroundColor: C.surface,
              paddingHorizontal: 16,
              paddingBottom: 12,
              paddingTop: 20,
            },
          ]}
        >
          {/* Floating label — pointer events disabled so it doesn't block input */}
          <Animated.Text
            style={[
              labelAnimatedStyle,
              labelColorStyle,
              { position: "absolute", left: 16, top: 16, fontSize: 16 },
            ]}
            numberOfLines={1}
            pointerEvents="none"
          >
            {label}
          </Animated.Text>

          <TextInput
            ref={ref}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={onChangeText}
            style={{ margin: 0, padding: 0, fontSize: 16, color: C.textPrimary }}
            placeholderTextColor={C.textTertiary}
            accessibilityLabel={label}
            accessibilityHint={hasError ? error : undefined}
            {...rest}
          />
        </Animated.View>

        {/* Error message */}
        {hasError && (
          <Text
            style={{
              marginLeft: 4,
              marginTop: 6,
              fontSize: 14,
              color: C.alert,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    );
  },
);

Input.displayName = "Input";

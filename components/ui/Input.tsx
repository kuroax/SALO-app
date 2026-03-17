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

    // Label color: always red when error, otherwise gray → dark on focus.
    const labelColorStyle = useAnimatedStyle(() => ({
      color: hasError
        ? "#dc2626"
        : interpolateColor(
            borderProgress.value,
            [0, 1],
            ["#9ca3af", "#111827"],
          ),
    }));

    // Border color: soft red when error, otherwise gray → dark on focus.
    const borderColorStyle = useAnimatedStyle(() => ({
      borderColor: hasError
        ? "#fca5a5"
        : interpolateColor(
            borderProgress.value,
            [0, 1],
            ["#e5e7eb", "#111827"],
          ),
    }));

    // Handlers trigger state changes — useEffect drives animations.
    // Consumer handlers are composed via optional chaining.
    const handleFocus: NonNullable<TextInputProps["onFocus"]> = (e) => {
      setIsFocused(true);
      consumerFocus?.(e);
    };

    const handleBlur: NonNullable<TextInputProps["onBlur"]> = (e) => {
      setIsFocused(false);
      consumerBlur?.(e);
    };

    return (
      <View className="w-full">
        <Animated.View
          style={borderColorStyle}
          className="relative rounded-2xl border bg-white px-4 pb-3 pt-5"
        >
          {/* Floating label — pointer events disabled so it doesn't block input */}
          <Animated.Text
            style={[labelAnimatedStyle, labelColorStyle]}
            className="absolute left-4 top-4 text-base"
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
            className="m-0 p-0 text-base text-gray-900"
            placeholderTextColor="#9ca3af"
            accessibilityLabel={label}
            accessibilityHint={hasError ? error : undefined}
            {...rest}
          />
        </Animated.View>

        {/* Error message */}
        {hasError && (
          <Text className="ml-1 mt-1.5 text-sm text-red-500">{error}</Text>
        )}
      </View>
    );
  },
);

Input.displayName = "Input";

import { Colors, type ThemeColors } from "@/constants/Colors";
import { resolveAccent, useThemeStore } from "@/lib/store/theme.store";
import { useColorScheme } from "react-native";

/**
 * useColors()
 *
 * Returns the full theme token set for the current color scheme,
 * with the accent color overridden by the user's chosen palette.
 *
 * Usage — replace direct Colors[scheme] access:
 *   const C = useColors();
 *
 * All screens that use C.accent will automatically reflect
 * the user's chosen accent without any further changes.
 */
export function useColors(): ThemeColors {
  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";
  const accentKey = useThemeStore((s) => s.accentKey);
  const accent = resolveAccent(accentKey, scheme);

  // Spread the static theme tokens and override accent with the dynamic value.
  // accentMuted is derived as a 15% opacity tint of the accent.
  return {
    ...Colors[scheme],
    accent,
    // accentMuted: keep the static value — it reads as a background tint.
    // If you want it dynamic too, compute: accent + "25" (hex alpha).
  } as ThemeColors;
}

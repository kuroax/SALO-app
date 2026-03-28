import { Colors, type ThemeColors } from "@/constants/Colors";
import { resolveAccent, useThemeStore } from "@/lib/store/theme.store";
import { useColorScheme } from "react-native";

/**
 * useColors()
 *
 * Returns the full theme token set for the effective color scheme,
 * with the accent color overridden by the user's chosen palette.
 *
 * The effective scheme is:
 *   1. User's explicit override stored in theme store (dark / light)
 *   2. System setting as fallback
 *
 * Usage:
 *   const C = useColors();
 */
export function useColors(): ThemeColors {
  const systemRaw = useColorScheme();
  const system: "light" | "dark" = systemRaw === "light" ? "light" : "dark";

  const storedScheme = useThemeStore((s) => s.colorScheme);
  const scheme: "light" | "dark" = storedScheme ?? system;

  const accentKey = useThemeStore((s) => s.accentKey);
  const accent = resolveAccent(accentKey, scheme);

  return {
    ...Colors[scheme],
    accent,
  } as ThemeColors;
}

/**
 * useScheme()
 *
 * Returns the effective color scheme (stored override or system).
 * Use this in screens that need to set StatusBar style.
 */
export function useScheme(): "light" | "dark" {
  const systemRaw = useColorScheme();
  const system: "light" | "dark" = systemRaw === "light" ? "light" : "dark";
  const storedScheme = useThemeStore((s) => s.colorScheme);
  return storedScheme ?? system;
}

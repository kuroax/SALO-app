import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

// ─── Accent palette ───────────────────────────────────────────────────────────
// Each color has a dark and light variant so the accent always
// reads well regardless of the current color scheme.

export type AccentKey = "sand" | "amber" | "indigo" | "rose" | "emerald";

export type AccentOption = {
  key: AccentKey;
  label: string;
  dark: string; // used in dark mode
  light: string; // used in light mode
};

export const ACCENT_OPTIONS: readonly AccentOption[] = [
  { key: "sand", label: "Sand", dark: "#c8b99a", light: "#8b6f47" },
  { key: "amber", label: "Amber", dark: "#f59e0b", light: "#d97706" },
  { key: "indigo", label: "Indigo", dark: "#818cf8", light: "#4f46e5" },
  { key: "rose", label: "Rose", dark: "#fb7185", light: "#e11d48" },
  { key: "emerald", label: "Emerald", dark: "#34d399", light: "#059669" },
] as const;

const THEME_KEY = "salo_accent_key";

// ─── Store ────────────────────────────────────────────────────────────────────

type ThemeState = {
  accentKey: AccentKey;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setAccent: (key: AccentKey) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  accentKey: "sand",
  isHydrated: false,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_KEY);
      const key = ACCENT_OPTIONS.find((o) => o.key === stored)?.key ?? "sand";
      set({ accentKey: key, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  setAccent: async (key: AccentKey) => {
    set({ accentKey: key });
    try {
      await SecureStore.setItemAsync(THEME_KEY, key);
    } catch {
      // Persist failure is non-critical — accent is still applied in-memory.
    }
  },
}));

// ─── Helper ───────────────────────────────────────────────────────────────────
// Returns the hex accent color for the current scheme and accent key.

export function resolveAccent(
  key: AccentKey,
  scheme: "light" | "dark",
): string {
  const option = ACCENT_OPTIONS.find((o) => o.key === key) ?? ACCENT_OPTIONS[0];
  return scheme === "dark" ? option.dark : option.light;
}

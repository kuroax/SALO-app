import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

// ─── Accent palette ───────────────────────────────────────────────────────────

export type AccentKey = "sky" | "amber" | "indigo" | "rose" | "emerald";

export type AccentOption = {
  key: AccentKey;
  label: string;
  dark: string;
  light: string;
};

export const ACCENT_OPTIONS: readonly AccentOption[] = [
  { key: "sky", label: "Sky", dark: "#38bdf8", light: "#0284c7" }, // replaces sand
  { key: "amber", label: "Amber", dark: "#f59e0b", light: "#d97706" },
  { key: "indigo", label: "Indigo", dark: "#818cf8", light: "#4f46e5" },
  { key: "rose", label: "Rose", dark: "#fb7185", light: "#e11d48" },
  { key: "emerald", label: "Emerald", dark: "#34d399", light: "#059669" },
] as const;

const DEFAULT_ACCENT: AccentKey = "indigo";
const THEME_KEY = "salo_accent_key";

// ─── Store ────────────────────────────────────────────────────────────────────

type ThemeState = {
  accentKey: AccentKey;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setAccent: (key: AccentKey) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  accentKey: DEFAULT_ACCENT,
  isHydrated: false,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(THEME_KEY);
      // If stored value is "sand" (old key) or invalid, fall back to default
      const key =
        ACCENT_OPTIONS.find((o) => o.key === stored)?.key ?? DEFAULT_ACCENT;
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
      // Non-critical — accent applied in-memory regardless.
    }
  },
}));

// ─── Helper ───────────────────────────────────────────────────────────────────

export function resolveAccent(
  key: AccentKey,
  scheme: "light" | "dark",
): string {
  const option = ACCENT_OPTIONS.find((o) => o.key === key) ?? ACCENT_OPTIONS[2];
  return scheme === "dark" ? option.dark : option.light;
}

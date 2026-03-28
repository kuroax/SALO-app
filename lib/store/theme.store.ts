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
  { key: "sky", label: "Sky", dark: "#38bdf8", light: "#0284c7" },
  { key: "amber", label: "Amber", dark: "#f59e0b", light: "#d97706" },
  { key: "indigo", label: "Indigo", dark: "#818cf8", light: "#4f46e5" },
  { key: "rose", label: "Rose", dark: "#fb7185", light: "#e11d48" },
  { key: "emerald", label: "Emerald", dark: "#34d399", light: "#059669" },
] as const;

const DEFAULT_ACCENT: AccentKey = "indigo";
const THEME_KEY = "salo_accent_key";
const SCHEME_KEY = "salo_color_scheme";

// ─── Store ────────────────────────────────────────────────────────────────────

type ThemeState = {
  accentKey: AccentKey;
  colorScheme: "light" | "dark" | null; // null = follow system
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setAccent: (key: AccentKey) => Promise<void>;
  setColorScheme: (scheme: "light" | "dark" | null) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set) => ({
  accentKey: DEFAULT_ACCENT,
  colorScheme: null,
  isHydrated: false,

  hydrate: async () => {
    try {
      const [storedAccent, storedScheme] = await Promise.all([
        SecureStore.getItemAsync(THEME_KEY),
        SecureStore.getItemAsync(SCHEME_KEY),
      ]);
      const key =
        ACCENT_OPTIONS.find((o) => o.key === storedAccent)?.key ??
        DEFAULT_ACCENT;
      const scheme =
        storedScheme === "light" || storedScheme === "dark"
          ? storedScheme
          : null;
      set({ accentKey: key, colorScheme: scheme, isHydrated: true });
    } catch {
      set({ isHydrated: true });
    }
  },

  setAccent: async (key: AccentKey) => {
    set({ accentKey: key });
    try {
      await SecureStore.setItemAsync(THEME_KEY, key);
    } catch {}
  },

  setColorScheme: async (scheme: "light" | "dark" | null) => {
    set({ colorScheme: scheme });
    try {
      if (scheme === null) {
        await SecureStore.deleteItemAsync(SCHEME_KEY);
      } else {
        await SecureStore.setItemAsync(SCHEME_KEY, scheme);
      }
    } catch {}
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

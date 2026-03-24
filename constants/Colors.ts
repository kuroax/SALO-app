// ─── SALO Design System ───────────────────────────────────────────────────────
// Premium reseller aesthetic: deep charcoal dark mode, warm off-white light mode.
// Accent palette inspired by Alo/Lululemon editorial — sand, amber, slate.

export const Colors = {
  dark: {
    // Backgrounds
    background: "#0c0c0c",
    surface: "#181818",
    surfaceElevated: "#222222",
    border: "#2a2a2a",

    // Text
    textPrimary: "#f0ece4",
    textSecondary: "#9a9284",
    textTertiary: "#5c5650",

    // Brand accent
    accent: "#c8b99a",
    accentMuted: "#2e2820",

    // Semantic — stat cards
    pending: "#f59e0b",
    pendingBg: "#1c1508",
    today: "#6366f1",
    todayBg: "#0e0d1f",
    alert: "#ef4444",
    alertBg: "#1f0808",
    success: "#10b981",
    successBg: "#081a11",

    // Tab bar
    tabActive: "#f0ece4",
    tabInactive: "#4a4540",
    tabBar: "#0c0c0c",
    tabBorder: "#1e1e1e",
  },

  light: {
    // Backgrounds
    background: "#f7f5f2",
    surface: "#ffffff",
    surfaceElevated: "#ffffff",
    border: "#e8e4de",

    // Text
    textPrimary: "#1a1714",
    textSecondary: "#6b635a",
    textTertiary: "#a39d96",

    // Brand accent
    accent: "#8b6f47",
    accentMuted: "#f5ede0",

    // Semantic — stat cards
    pending: "#d97706",
    pendingBg: "#fffbeb",
    today: "#4f46e5",
    todayBg: "#eef2ff",
    alert: "#dc2626",
    alertBg: "#fef2f2",
    success: "#059669",
    successBg: "#ecfdf5",

    // Tab bar
    tabActive: "#1a1714",
    tabInactive: "#a39d96",
    tabBar: "#ffffff",
    tabBorder: "#e8e4de",
  },
} as const;

export type ColorScheme = keyof typeof Colors;

// Widened type — each value is string, not a string literal.
// This allows both Colors.dark and Colors.light to satisfy the same prop type
// without TypeScript complaining about incompatible literal types.
export type ThemeColors = {
  [K in keyof typeof Colors.dark]: string;
};

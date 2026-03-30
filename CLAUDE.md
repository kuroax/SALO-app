# SALO — Clothing Reseller Automation System

## Project Overview

SALO is a mobile app for a clothing resale boutique based in Guadalajara, Mexico. It automates inventory management, order processing, and customer interactions. A WhatsApp bot persona named "Luis" handles customer communication.

## Tech Stack

- **Framework:** React Native + Expo SDK 55 + Expo Router (file-based routing)
- **State/Data:** Apollo Client 4 + GraphQL, Zustand
- **Language:** TypeScript
- **Locale:** `es-MX`, currency `MXN`

## Project Structure

```
app/(app)/orders/       # Order screens
app/(app)/customers/    # Customer screens
app/(app)/inventory/    # Inventory screens
components/             # Shared components (Section, InfoRow, EditField, StatusBadge, etc.)
components/index.ts     # Barrel export for shared components
constants/              # App constants, colors, config
```

## ⚠️ Critical Style Rules — READ FIRST

These rules are **mandatory**. Do NOT use alternatives.

### 1. Inline styles ONLY

```tsx
// ✅ CORRECT
<View style={{ padding: 16, backgroundColor: C.background }}>

// ❌ WRONG — no className, no StyleSheet.create, no NativeWind/Tailwind
<View className="p-4 bg-white">
<View style={styles.container}>
```

> NativeWind and TailwindCSS files exist in the repo but are **deprecated/unused**. Ignore `global.css`, `tailwind.config.js`, `nativewind-env.d.ts`.

### 2. Colors via `useColors()` hook

Always destructure as `C` for brevity:

```tsx
const C = useColors();

<Text style={{ color: C.text }}>Hello</Text>
<View style={{ backgroundColor: C.card }}>
```

The app has a dynamic accent color system supporting dark/light modes. Never hardcode color values — always use `C.*`.

### 3. `TouchableOpacity` only — never `Pressable`

```tsx
// ✅ CORRECT
import { TouchableOpacity } from 'react-native';
<TouchableOpacity onPress={handlePress}>

// ❌ WRONG
import { Pressable } from 'react-native';
<Pressable onPress={handlePress}>
```

### 4. No `gap` property

React Native's `gap` has inconsistent support. Use `marginBottom`, `marginRight`, or spacer `<View>` elements instead.

```tsx
// ✅ CORRECT
{items.map((item, i) => (
  <View key={item.id} style={{ marginBottom: i < items.length - 1 ? 12 : 0 }}>
    ...
  </View>
))}

// ❌ WRONG
<View style={{ gap: 12 }}>
```

### 5. File naming: PascalCase for components

```
components/StatusBadge.tsx    ✅
components/status-badge.tsx   ❌
components/statusBadge.tsx    ❌
```

## Shared Components

Import from the barrel file:

```tsx
import { Section, InfoRow, EditField, StatusBadge } from "@/components";
```

When creating new reusable components, add them to `components/` root and export from `components/index.ts`.

## Backend / GraphQL Conventions

### Customer Channel Enum

The backend `CustomerChannel` enum uses `whatsapp` and `instagram` only. There is no `manual` value.

```tsx
// When creating customers from the app UI, map to whatsapp:
channel: "whatsapp"; // ✅ for manual/app-created customers
channel: "manual"; // ❌ does not exist in backend enum
```

### Phone Number Normalization (Mexico)

All phone numbers must be normalized before sending to the backend:

```tsx
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `+52${digits}`;
}
```

- Strip all non-numeric characters
- Prepend `+52` (Mexico country code)

## Apollo Client Notes

### Cache Warning — Safe to Ignore

When using `fetchPolicy: "cache-and-network"`, Apollo may log a cache warning. This is **expected behavior**. Do NOT add `merge: true` to `Query.fields` — it previously caused cache corruption.

## Code Style Quick Reference

| Rule       | Do                                                    | Don't                              |
| ---------- | ----------------------------------------------------- | ---------------------------------- |
| Styles     | Inline `style={{}}`                                   | `StyleSheet.create`, `className`   |
| Colors     | `const C = useColors()` then `C.text`, `C.background` | Hardcoded hex/rgb values           |
| Touchables | `TouchableOpacity`                                    | `Pressable`                        |
| Spacing    | `marginBottom`, `marginRight`                         | `gap`                              |
| File names | `PascalCase.tsx`                                      | `kebab-case.tsx`, `camelCase.tsx`  |
| Imports    | Barrel `@/components`                                 | Deep imports for shared components |
| Channel    | `"whatsapp"`, `"instagram"`                           | `"manual"`                         |
| Phone      | Strip non-digits + prepend `+52`                      | Raw user input to API              |
| Locale     | `es-MX`, `MXN`                                        | `en-US`, `USD`                     |

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
lib/apollo/             # Apollo client + auth links
lib/graphql/            # GraphQL queries and mutations
lib/hooks/              # useColors, useScheme
lib/store/              # Zustand stores (auth, theme)
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

### 2. Colors via `useColors()` + `useScheme()`

Always destructure as `C` for brevity. Use `useScheme()` for `StatusBar`:

```tsx
const C = useColors();
const scheme = useScheme(); // "dark" | "light"

<StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
<Text style={{ color: C.textPrimary }}>Hello</Text>
<View style={{ backgroundColor: C.background }}>
```

Never use `useColorScheme()` from React Native directly — always use `useScheme()` from `@/lib/hooks/useColors`.
Never hardcode color hex values — always use `C.*`.

### 3. `TouchableOpacity` only — never `Pressable`

```tsx
// ✅ CORRECT
import { TouchableOpacity } from 'react-native';
<TouchableOpacity onPress={handlePress} activeOpacity={0.7}>

// ❌ WRONG
import { Pressable } from 'react-native';
<Pressable onPress={handlePress}>
```

### 4. No `gap` property

Use `marginBottom`, `marginRight`, or spacer `<View>` elements instead:

```tsx
// ✅ CORRECT — spacer View between items
<View style={{ flexDirection: "row" }}>
  <ComponentA />
  <View style={{ width: 10 }} />
  <ComponentB />
</View>

// ❌ WRONG
<View style={{ gap: 12 }}>
```

### 5. File naming: PascalCase for components

```
components/StatusBadge.tsx    ✅
components/status-badge.tsx   ❌
components/statusBadge.tsx    ❌
```

### 6. ScrollView padding

All `ScrollView` must have `paddingBottom: 120` in `contentContainerStyle` to account for the tab bar:

```tsx
// ✅ CORRECT
<ScrollView contentContainerStyle={{ paddingBottom: 120 }}>

// ❌ WRONG — content gets hidden behind tab bar
<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
```

### 7. Modal pattern

All edit/picker modals use `pageSheet` slide-up:

```tsx
<Modal
  visible={visible}
  animationType="slide"
  presentationStyle="pageSheet"
>
```

## Shared Components

Import from the barrel file:

```tsx
import { Section, InfoRow, EditField, StatusBadge } from "@/components";
```

| Component     | Purpose                                           |
| ------------- | ------------------------------------------------- |
| `Section`     | Uppercase label + bordered card container         |
| `InfoRow`     | Label/value row inside a Section                  |
| `EditField`   | Labelled TextInput for forms and edit modals      |
| `StatusBadge` | Colored pill for order/payment/inventory statuses |

When creating new reusable components, add them to `components/` root and export from `components/index.ts`.

## Backend / GraphQL Conventions

### Customer Channel Enum

The backend `CustomerChannel` enum uses `whatsapp` and `instagram` only. There is no `manual` value.

```tsx
// When creating customers from the app UI, map to whatsapp:
contactChannel: "whatsapp"; // ✅ for manual/app-created customers
contactChannel: "manual"; // ❌ does not exist in backend enum
```

### Phone Number Normalization (Mexico)

All phone numbers must be normalized before sending to the backend:

```tsx
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length > 0 && !cleaned.startsWith("+")) {
    return `+52${cleaned}`;
  }
  return cleaned;
}
```

- Strip all non-numeric characters (spaces, dashes, parentheses)
- If no leading `+`, prepend `+52` (Mexico country code)
- User can type freely — normalize before sending to API

## Apollo Client Notes

### Cache Warning — Safe to Ignore

When using `fetchPolicy: "cache-and-network"`, Apollo may log a cache warning about missing merge functions. This is **expected behavior**. Do NOT add `merge: true` to `Query.fields` in `client.ts` — it previously caused cache corruption on the orders screen.

## Environment / Config

The app uses explicit environment profiles via `EXPO_PUBLIC_` variables:

| File                  | Used for                                              |
| --------------------- | ----------------------------------------------------- |
| `.env.development`    | Local dev → `localhost:4000`                          |
| `.env.production`     | EAS builds → Railway backend                          |
| `app.config.js`       | Dynamic Expo config, reads env vars                   |
| `eas.json`            | EAS build profiles (development, preview, production) |
| `constants/Config.ts` | Single source of truth for `API_URL` in code          |

Never hardcode backend URLs in code — always go through `Config.API_URL`.

## Code Style Quick Reference

| Rule       | Do                                                           | Don't                              |
| ---------- | ------------------------------------------------------------ | ---------------------------------- |
| Styles     | Inline `style={{}}`                                          | `StyleSheet.create`, `className`   |
| Colors     | `const C = useColors()` then `C.textPrimary`, `C.background` | Hardcoded hex/rgb values           |
| Scheme     | `const scheme = useScheme()`                                 | `useColorScheme()` from RN         |
| Touchables | `TouchableOpacity` + `activeOpacity={0.7}`                   | `Pressable`                        |
| Spacing    | `marginBottom`, `marginRight`, spacer `<View>`               | `gap`                              |
| ScrollView | `contentContainerStyle={{ paddingBottom: 120 }}`             | `paddingBottom: 40` or less        |
| Modals     | `presentationStyle="pageSheet"`                              | `presentationStyle="fullScreen"`   |
| File names | `PascalCase.tsx`                                             | `kebab-case.tsx`, `camelCase.tsx`  |
| Imports    | Barrel `@/components`                                        | Deep imports for shared components |
| Channel    | `"whatsapp"`, `"instagram"`                                  | `"manual"`                         |
| Phone      | Strip non-digits + prepend `+52`                             | Raw user input to API              |
| Locale     | `es-MX`, `MXN`                                               | `en-US`, `USD`                     |

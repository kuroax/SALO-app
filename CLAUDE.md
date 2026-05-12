# CLAUDE.md — SALO App Frontend

## Claude Code behavior rules

Read this section first. These rules apply to every task in this repo.

- **Inspect before editing.** Read the relevant file completely before making any change. Never assume its current content from memory.
- **Do not create new files unless explicitly requested.** The component and screen structure is established. New files require a clear reason.
- **Do not restructure folders.** The routing and component hierarchy is intentional.
- **Do not install new dependencies** without explicit instruction.
- **Do not modify fragile files** listed in the section below without explicit instruction.
- **Prefer the smallest safe change.** Do not refactor code that is not part of the requested task.
- **Run typecheck after every change:** `npx tsc --noEmit`
- **When in doubt, ask — do not guess.**

---

## Project overview

SALO is a React Native mobile app for a clothing resale boutique in Guadalajara, Mexico. It is the owner-facing management tool: inventory, orders, customers, revenue, and team members. A WhatsApp bot named "Luis" handles customer-facing sales; this app handles the owner's side of the business.

---

## Tech stack

| Layer        | Choice                                                      |
| ------------ | ----------------------------------------------------------- |
| Framework    | React Native 0.83.6 + Expo SDK 55                           |
| Routing      | Expo Router ~55.0.10 (file-based)                           |
| State / Data | Apollo Client 4 + GraphQL, Zustand 5                        |
| Language     | TypeScript 5 (strict mode)                                  |
| Auth storage | expo-secure-store ~55.0.11                                  |
| Image upload | expo-image-picker ~55.0.16                                  |
| Animations   | react-native-reanimated 4.2.1 + react-native-worklets 0.7.4 |
| Locale       | es-MX, currency MXN                                         |

No NativeWind. No TailwindCSS. No StyleSheet.create. No testing framework. No lint script.

---

## Commands

```bash
npx expo start          # start Metro bundler
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
npx tsc --noEmit        # TypeScript typecheck — run after every change
```

There is no `npm run lint` or `npm run test` script in package.json. Typecheck is the only automated validation.

---

## Path aliases

`tsconfig.json` maps `@/*` to `./*`. Use `@/` for all imports:

```ts
import { useColors } from "@/lib/hooks/useColors";
import { Section } from "@/components";
import { formatCurrency } from "@/lib/format";
```

---

## Full project structure

```
app/
├── _layout.tsx                    # Root layout — auth gate + theme gate + Apollo provider
│                                  # + ErrorBoundary wrapper. FRAGILE.
├── (auth)/
│   ├── _layout.tsx                # Auth group layout. FRAGILE.
│   └── login.tsx                  # Login screen
├── (app)/
│   ├── _layout.tsx                # Main app layout — tab navigator
│   ├── index.tsx                  # Home / dashboard screen
│   ├── orders/
│   │   ├── _layout.tsx
│   │   ├── index.tsx              # Orders list
│   │   ├── [id].tsx               # Order detail
│   │   └── create-order.tsx       # Create order form
│   ├── customers/
│   │   ├── _layout.tsx
│   │   ├── index.tsx              # Customers list
│   │   └── [id].tsx               # Customer detail
│   ├── inventory/
│   │   ├── _layout.tsx
│   │   ├── index.tsx              # Inventory list
│   │   ├── [productId].tsx        # Product detail
│   │   └── add-product.tsx        # Add product form — uses expo-image-picker
│   └── more/
│       ├── _layout.tsx
│       ├── index.tsx              # Settings / more screen
│       ├── add-member.tsx         # Add team member
│       └── change-password.tsx    # Change password
└── revenue.tsx                    # Revenue detail screen — outside (app) group,
                                   # accessed via router.push("/revenue") from dashboard

components/
├── index.ts                       # Barrel export for root-level shared components
├── ErrorBoundary.tsx              # Global error boundary — wraps root layout.
│                                  # Class component (ErrorBoundaryInner) + function
│                                  # wrapper. Shows "Algo salió mal" + reload button.
├── Section.tsx                    # Uppercase label + bordered card container
├── InfoRow.tsx                    # Label/value row inside a Section
├── EditField.tsx                  # Labelled TextInput for forms and edit modals
├── StatusBadge.tsx                # Colored pill for order/payment/inventory statuses
├── StyledText.tsx                 # Legacy Expo default — do not import in new code
├── Themed.tsx                     # Legacy Expo default — do not import in new code
├── ExternalLink.tsx               # Legacy Expo default — do not import in new code
├── useColorScheme.ts              # Legacy Expo default — do NOT import; use useScheme()
├── useClientOnlyValue.ts          # Expo web utility — do not modify
├── orders/
│   └── OrderCard.tsx              # Dead code — no screen currently imports this.
│                                  # Do not import. Candidate for removal post-launch.
└── ui/
    ├── index.ts                   # Barrel export for UI primitives
    ├── Badge.tsx                  # Generic badge/chip
    ├── Button.tsx                 # Primary button primitive
    ├── Card.tsx                   # Card container primitive
    └── Input.tsx                  # Input primitive

lib/
├── apollo/
│   ├── client.ts                  # Apollo client setup. FRAGILE.
│   └── links/
│       ├── auth.link.ts           # Attaches JWT to every request. FRAGILE.
│       └── refresh.link.ts        # 401 → silent token refresh. FRAGILE.
│                                  # Uses module-scope refreshingPromise to serialize
│                                  # concurrent refresh attempts — do not remove this.
├── cloudinary.ts                  # uploadToCloudinary(uri) helper.
│                                  # Reads CLOUDINARY_CLOUD_NAME and
│                                  # CLOUDINARY_UPLOAD_PRESET from Config.ts.
│                                  # Both env vars must be set or startup throws.
├── format.ts                      # Shared formatting utilities (es-MX locale):
│                                  # formatCurrency(amount), formatDate(dateString),
│                                  # normalizePhone(raw). Import from here — do not
│                                  # redefine these in any screen.
├── graphql/
│   ├── mutations/
│   │   ├── customer.mutations.ts
│   │   ├── inventory.mutations.ts
│   │   ├── order.mutations.ts
│   │   └── product.mutations.ts
│   └── queries/
│       ├── customer.queries.ts
│       ├── inventory.queries.ts
│       ├── order.queries.ts
│       └── product.queries.ts
├── hooks/
│   └── useColors.ts               # useColors() and useScheme() hooks
├── status.ts                      # Shared status-to-color helpers:
│                                  # getStatusColor(status: OrderStatus): string
│                                  # getPaymentColor(status: PaymentStatus): string
│                                  # Import from here — do not redefine in screens.
├── store/
│   ├── auth.store.ts              # Zustand auth store — tokens, user.
│   │                              # logout() calls apolloClient.clearStore()
│   │                              # after wiping tokens. FRAGILE.
│   └── theme.store.ts             # Zustand theme store — dark/light
└── types.ts                       # Canonical shared TypeScript types:
                                   # OrderStatus, PaymentStatus, ContactChannel,
                                   # CustomerTag, Order, Customer, OrderItem, etc.
                                   # Import from here — do not redeclare in screens.

constants/
    Config.ts                      # Single source of truth for runtime config:
                                   # API_URL, CLOUDINARY_CLOUD_NAME,
                                   # CLOUDINARY_UPLOAD_PRESET.
                                   # All three throw at startup if env var missing.

assets/                            # App icons, splash screens
```

---

## ⚠️ Fragile files — do not modify without explicit instruction

| File                               | Why fragile                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lib/apollo/links/auth.link.ts`    | Attaches JWT to every GraphQL request                                                                   |
| `lib/apollo/links/refresh.link.ts` | Silent token refresh on 401 — concurrent refresh serialized via module-scope promise                    |
| `lib/apollo/client.ts`             | Apollo client setup — cache configuration is intentional                                                |
| `lib/store/auth.store.ts`          | Token persistence + apolloClient.clearStore() on logout                                                 |
| `app/_layout.tsx`                  | Root auth gate + theme hydration gate + ErrorBoundary — wrong change = auth bypass or infinite redirect |
| `app/(auth)/_layout.tsx`           | Auth group layout                                                                                       |
| `constants/Config.ts`              | API_URL + Cloudinary config — never hardcode these values elsewhere                                     |

---

## ⚠️ Critical style rules — mandatory

### 1. Inline styles only

```tsx
// ✅ CORRECT
<View style={{ padding: 16, backgroundColor: C.background }}>

// ❌ WRONG — never use these
<View className="p-4 bg-white">   // NativeWind is removed
<View style={styles.container}>    // no StyleSheet.create
```

### 2. Colors via `useColors()` only

```tsx
const C = useColors();
const scheme = useScheme();

<StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
<Text style={{ color: C.textPrimary }}>Hello</Text>
<View style={{ backgroundColor: C.background }}>
```

- `useColors()` and `useScheme()` come from `@/lib/hooks/useColors`
- **Never** use `useColorScheme()` from React Native directly
- **Never** use the `components/useColorScheme.ts` file — it is a legacy Expo default
- **Never** hardcode hex color values anywhere
- **Never** render `<StatusBar>` in individual screens — it is handled once
  at the root in `app/_layout.tsx`. It reads `useScheme()` automatically.

### 3. `TouchableOpacity` only — never `Pressable`

```tsx
// ✅ CORRECT
<TouchableOpacity onPress={handlePress} activeOpacity={0.7}>

// ❌ WRONG
<Pressable onPress={handlePress}>
```

### 4. No `gap` property

Use `marginBottom`, `marginRight`, or a spacer `<View>` instead:

```tsx
// ✅ CORRECT
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
```

### 6. ScrollView padding

All `ScrollView` must have `paddingBottom: 120` in `contentContainerStyle`:

```tsx
<ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
```

### 7. Modal pattern

All modals use `pageSheet` slide-up:

```tsx
<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
```

### 8. Screen header top padding

All screen headers use safe-area insets, not hardcoded values:

```tsx
import { useSafeAreaInsets } from "react-native-safe-area-context";

const insets = useSafeAreaInsets();
// Header container:
<View style={{ paddingTop: insets.top + 16 }}>
```

Never use `paddingTop: 64` or any other hardcoded top value on screen headers.
`react-native-safe-area-context` is already in package.json — no new install needed.

### 9. FlatList performance

Row components rendered inside `renderItem` must be wrapped with `React.memo()`.
Callbacks passed to row components must use `useCallback()` with correct dependencies.
Fixed-height lists must provide `getItemLayout` — calculate from known style values.

```tsx
const ROW_HEIGHT = 137; // measured from style values
const MyRow = React.memo(({ item, onPress }: Props) => { ... });

<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  getItemLayout={(_data, index) => ({
    length: ROW_HEIGHT,
    offset: ROW_HEIGHT * index,
    index,
  })}
  renderItem={({ item }) => <MyRow item={item} onPress={handlePress} />}
/>
```

---

## Component systems

### Root shared components — `@/components`

```tsx
import {
  Section,
  InfoRow,
  EditField,
  StatusBadge,
  ErrorBoundary,
} from "@/components";
```

| Component          | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `Section`          | Uppercase label + bordered card container              |
| `InfoRow`          | Label/value row inside a Section                       |
| `EditField`        | Labelled TextInput for forms                           |
| `StatusBadge`      | Colored pill for statuses                              |
| `ErrorBoundary`    | Root error boundary — already used in app/\_layout.tsx |
| `orders/OrderCard` | Card used in orders list                               |

### UI primitives — `@/components/ui`

```tsx
import { Button, Input, Card, Badge } from "@/components/ui";
```

Check `components/ui/` before building any new button, input, or card from scratch.

### Shared utilities — always import, never redefine

```tsx
import { formatCurrency, formatDate, normalizePhone } from "@/lib/format";
import { getStatusColor, getPaymentColor } from "@/lib/status";
import type { OrderStatus, PaymentStatus, Order, Customer } from "@/lib/types";
import { uploadToCloudinary } from "@/lib/cloudinary";
```

These helpers were previously duplicated across screens. They now live in shared files. Do not redeclare them in any screen.

### Legacy files — do not use or import

`StyledText.tsx`, `Themed.tsx`, `ExternalLink.tsx`, `useColorScheme.ts`, `useClientOnlyValue.ts` — legacy Expo template files. Still exist but must not be imported in new code.

---

## Routing conventions

Expo Router file-based routing. Groups:

- `(auth)` — unauthenticated screens (login)
- `(app)` — authenticated screens with tab bar
- `revenue.tsx` — standalone screen outside both groups, pushed via `router.push("/revenue")`

Dynamic routes use `[id]` and `[productId]` — match the exact segment name when navigating.

Tab routes are statically typed via `Href` from expo-router. Do not use `as never` casts for navigation — `experiments.typedRoutes: true` is enabled in `app.config.js`.

---

## State management

**Apollo Client** owns server data (orders, customers, inventory, products).
**Zustand** owns local app state (auth tokens, theme).

Rules:

- Do not store server data in Zustand — use Apollo cache
- Do not put local UI state in Zustand — use `useState`
- Zustand stores live in `lib/store/`

---

## Apollo Client notes

### Cache warning — safe to ignore

`fetchPolicy: "cache-and-network"` may log a cache warning. This is expected. Do NOT add `merge: true` to `Query.fields` in `client.ts` — it previously caused cache corruption on the orders screen.

### refetchQueries — use string form

Always use the operation name string, not the query object form:

```ts
// ✅ CORRECT
refetchQueries: ["ListOrders"];

// ❌ WRONG — only refetches the exact variable shape
refetchQueries: [{ query: LIST_ORDERS, variables: { filter: { limit: 20 } } }];
```

### Auth flow

Tokens stored in `expo-secure-store`. `auth.link.ts` attaches the access token to every request. `refresh.link.ts` intercepts 401s, serializes concurrent refresh attempts via a module-scope promise, and retries. `logout()` calls `apolloClient.clearStore()` after wiping tokens. Do not modify these files without reading them first.

---

## Environment / Config

| File                  | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `.env.development`    | Local dev — localhost:4000 + Cloudinary dev values       |
| `.env.production`     | Production — Railway backend + Cloudinary prod values    |
| `.env.example`        | Template — safe to commit                                |
| `app.config.js`       | Dynamic Expo config — reads EXPO*PUBLIC* vars            |
| `constants/Config.ts` | API_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET |

Required env vars — all throw at startup if missing:

```
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET
```

Rules:

- Never hardcode backend URLs or Cloudinary credentials in code
- Never commit `.env.development` or `.env.production`
- Never use Cloudinary directly in screens — always use `lib/cloudinary.ts`
- Use only `EXPO_PUBLIC_` prefix for variables accessible in the app bundle

---

## Backend / GraphQL conventions

### Customer channel enum

```ts
contactChannel: "whatsapp"; // ✅
contactChannel: "instagram"; // ✅
contactChannel: "manual"; // ❌ does not exist in backend enum
```

### Phone number normalization

Use `normalizePhone` from `@/lib/format` — do not reimplement inline.

---

## Security notes

**What is safe:**

- No secrets or API keys in source code
- `.gitignore` excludes `.env.development` and `.env.production`
- Tokens use `expo-secure-store` (encrypted on-device)
- Apollo cache is cleared on logout via `apolloClient.clearStore()`

**What cannot be guaranteed from this file alone:**

- Whether env files are actually excluded from version control in practice
- Whether `expo-secure-store` keys are rotated if a device is compromised

**Rules:**

- Never log JWT tokens or user credentials
- Never embed production credentials in `app.config.js` or any committed file

---

## NativeWind / Tailwind status

Removed. `nativewind-env.d.ts` is still referenced in `tsconfig.json` include but the file does not exist — stale reference, harmless. Do not re-introduce NativeWind. Do not use `className` props.

---

## What NOT to do

- Never use `StyleSheet.create`
- Never use `className` prop
- Never use `Pressable` — use `TouchableOpacity`
- Never use `gap` in styles
- Never use `useColorScheme()` from React Native directly
- Never import from `components/useColorScheme.ts`, `components/Themed.tsx`, or `components/StyledText.tsx`
- Never hardcode hex color values
- Never hardcode backend URLs or Cloudinary credentials
- Never modify `lib/apollo/links/` files without reading them first
- Never add `merge: true` to Apollo `Query.fields`
- Never store server data in Zustand
- Never use `paddingBottom` less than 120 in `ScrollView.contentContainerStyle`
- Never use `presentationStyle="fullScreen"` for modals
- Never create a new Button, Input, Card, or Badge — check `components/ui/` first
- Never redefine `formatCurrency`, `formatDate`, `normalizePhone` — import from `@/lib/format`
- Never redefine `getStatusColor`, `getPaymentColor` — import from `@/lib/status`
- Never redefine shared types (OrderStatus, PaymentStatus, etc.) — import from `@/lib/types`
- Never call Cloudinary API directly from screens — use `uploadToCloudinary` from `@/lib/cloudinary`
- Never use `as never` for route navigation — use typed `Href` from expo-router
- Never render `<StatusBar>` in individual screens — root layout handles it
- Never use hardcoded `paddingTop` values on screen headers — use `useSafeAreaInsets()`
- Never define row components inline inside `renderItem` — extract and wrap with `React.memo()`

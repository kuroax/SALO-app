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
```

---

## Full project structure

```
app/
├── _layout.tsx                    # Root layout — auth gate + Apollo provider
├── (auth)/
│   ├── _layout.tsx                # Auth group layout
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
                                   # accessed via router.push from dashboard

components/
├── index.ts                       # Barrel export for root-level shared components
├── Section.tsx                    # Uppercase label + bordered card container
├── InfoRow.tsx                    # Label/value row inside a Section
├── EditField.tsx                  # Labelled TextInput for forms and edit modals
├── StatusBadge.tsx                # Colored pill for order/payment/inventory statuses
├── StyledText.tsx                 # Legacy Expo default — do not import in new code
├── Themed.tsx                     # Legacy Expo default — do not import in new code
├── ExternalLink.tsx               # Legacy Expo default — do not import in new code
├── useColorScheme.ts              # Legacy Expo default — do NOT import; use useScheme() instead
├── useClientOnlyValue.ts          # Expo web utility — do not modify
├── orders/
│   └── OrderCard.tsx              # Order card used in orders list
└── ui/
    ├── index.ts                   # Barrel export for UI primitives
    ├── Badge.tsx                  # Generic badge/chip
    ├── Button.tsx                 # Primary button primitive
    ├── Card.tsx                   # Card container primitive
    └── Input.tsx                  # Input primitive

lib/
├── apollo/
│   ├── client.ts                  # Apollo client setup
│   └── links/
│       ├── auth.link.ts           # Attaches JWT access token to every request — FRAGILE
│       └── refresh.link.ts        # Handles 401 → silent token refresh flow — FRAGILE
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
└── store/
    ├── auth.store.ts              # Zustand auth store — tokens, user
    └── theme.store.ts             # Zustand theme store — dark/light

constants/
    Config.ts                      # API_URL — single source of truth for backend URL

assets/                            # App icons, splash screens
```

---

## ⚠️ Fragile files — do not modify without explicit instruction

These files handle authentication, token refresh, and critical infrastructure.
A mistake here breaks login for all users.

| File                               | Why fragile                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| `lib/apollo/links/auth.link.ts`    | Attaches JWT to every GraphQL request                            |
| `lib/apollo/links/refresh.link.ts` | Silent token refresh on 401 — complex async flow                 |
| `lib/apollo/client.ts`             | Apollo client setup — cache configuration is intentional         |
| `lib/store/auth.store.ts`          | Token persistence with expo-secure-store                         |
| `app/_layout.tsx`                  | Root auth gate — wrong change = auth bypass or infinite redirect |
| `app/(auth)/_layout.tsx`           | Auth group layout                                                |
| `constants/Config.ts`              | `API_URL` — never hardcode backend URLs elsewhere                |

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

---

## Component systems

### Root shared components — `@/components`

```tsx
import { Section, InfoRow, EditField, StatusBadge } from "@/components";
```

| Component          | Purpose                                   |
| ------------------ | ----------------------------------------- |
| `Section`          | Uppercase label + bordered card container |
| `InfoRow`          | Label/value row inside a Section          |
| `EditField`        | Labelled TextInput for forms              |
| `StatusBadge`      | Colored pill for statuses                 |
| `orders/OrderCard` | Card used in orders list                  |

### UI primitives — `@/components/ui`

```tsx
import { Button, Input, Card, Badge } from "@/components/ui";
```

These are lower-level primitives. Check `components/ui/` before building any new button, input, or card from scratch.

### Legacy files — do not use or import

`StyledText.tsx`, `Themed.tsx`, `ExternalLink.tsx`, `useColorScheme.ts`, `useClientOnlyValue.ts` — these are default Expo template files. They still exist but should not be imported in new code.

---

## Routing conventions

Expo Router file-based routing. Groups:

- `(auth)` — unauthenticated screens (login)
- `(app)` — authenticated screens with tab bar
- `revenue.tsx` — standalone screen outside both groups, pushed via `router.push("/revenue")`

Dynamic routes use `[id]` and `[productId]` — match the exact segment name when navigating.

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

### Auth flow

Tokens are stored in `expo-secure-store`. The `auth.link.ts` attaches the access token to every request. The `refresh.link.ts` intercepts 401 responses, silently refreshes the token, and retries. Do not modify these files without thoroughly reading their implementation first.

---

## Environment / Config

| File                  | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `.env.development`    | Local dev — points to localhost:4000                    |
| `.env.production`     | Production — points to Railway backend                  |
| `.env.example`        | Template — safe to commit                               |
| `app.config.js`       | Dynamic Expo config — reads EXPO*PUBLIC* vars           |
| `constants/Config.ts` | Exports `API_URL` — only place to reference backend URL |

Rules:

- Never hardcode backend URLs in code — always use `Config.API_URL`
- Never commit `.env.development` or `.env.production` to version control
- Use only `EXPO_PUBLIC_` prefix for variables that need to be accessible in the app bundle

---

## Backend / GraphQL conventions

### Customer channel enum

```ts
contactChannel: "whatsapp"; // ✅ for app-created customers
contactChannel: "instagram"; // ✅
contactChannel: "manual"; // ❌ does not exist in backend enum
```

### Phone number normalization (Mexico)

```ts
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.length > 0 && !cleaned.startsWith("+")) {
    return `+52${cleaned}`;
  }
  return cleaned;
}
```

Strip non-digits and prepend `+52` if no leading `+`. Always normalize before sending to the API.

---

## Security notes

**What is safe:**

- No secrets or API keys are stored in source code
- `.gitignore` excludes `.env.development` and `.env.production`
- Tokens use `expo-secure-store` (encrypted on-device storage)

**What cannot be guaranteed from this file alone:**

- Whether `.env.production` is actually excluded from version control in practice
- Whether all team members follow the `Config.API_URL` convention
- Whether `expo-secure-store` keys are rotated if a device is compromised

**Rules:**

- Never log JWT tokens or user credentials
- Never embed production credentials in `app.config.js` or any committed file
- Never hardcode the Railway backend URL — use `Config.API_URL`

---

## NativeWind / Tailwind status

NativeWind and TailwindCSS were removed. `nativewind-env.d.ts` is referenced in `tsconfig.json` but the file and the packages no longer exist as active dependencies. Do not re-introduce NativeWind. Do not use `className` props anywhere.

---

## What NOT to do

- Never use `StyleSheet.create`
- Never use `className` prop
- Never use `Pressable` — use `TouchableOpacity`
- Never use `gap` in styles
- Never use `useColorScheme()` from React Native directly
- Never import from `components/useColorScheme.ts`, `components/Themed.tsx`, or `components/StyledText.tsx`
- Never hardcode hex color values
- Never hardcode backend URLs
- Never modify `lib/apollo/links/` files without reading them first
- Never add `merge: true` to Apollo `Query.fields`
- Never store server data in Zustand
- Never use `paddingBottom` less than 120 in `ScrollView.contentContainerStyle`
- Never use `presentationStyle="fullScreen"` for modals
- Never create a new Button, Input, Card, or Badge component — check `components/ui/` first

import { ErrorBoundary } from "@/components";
import { apolloClient } from "@/lib/apollo/client";
import { useScheme } from "@/lib/hooks/useColors";
import { useAuthStore } from "@/lib/store/auth.store";
import { useThemeStore } from "@/lib/store/theme.store";
import { ApolloProvider } from "@apollo/client/react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const isThemeHydrated = useThemeStore((state) => state.isHydrated);

  const segments = useSegments();
  const router = useRouter();

  // Hydrate auth + theme once on mount.
  // Both are idempotent — safe under Strict Mode double-invoke in dev.
  useEffect(() => {
    hydrate();
    hydrateTheme();
  }, [hydrate, hydrateTheme]);

  // Redirect based on auth state — only runs after hydration is complete.
  useEffect(() => {
    if (!isHydrated || !isThemeHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [token, isHydrated, isThemeHydrated, segments, router]);

  // Block render until SecureStore has been read for both auth and theme.
  // Prevents flash of wrong screen / default theme on cold boot.
  if (!isHydrated || !isThemeHydrated) return null;

  // Render-time gate: prevent (app) children from mounting and firing
  // unauthenticated queries between token becoming null and the redirect
  // effect firing. Mirror the same group detection used by the effect.
  const inAuthGroup = segments[0] === "(auth)";
  if (!token && !inAuthGroup) return null;
  if (token && inAuthGroup) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  const scheme = useScheme();
  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <AuthGuard>
          <StatusBar
            barStyle={scheme === "dark" ? "light-content" : "dark-content"}
          />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen
              name="revenue"
              options={{
                presentation: "modal",
                headerShown: false,
              }}
            />
          </Stack>
        </AuthGuard>
      </ApolloProvider>
    </ErrorBoundary>
  );
}

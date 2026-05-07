import { ErrorBoundary } from "@/components";
import { apolloClient } from "@/lib/apollo/client";
import { useAuthStore } from "@/lib/store/auth.store";
import { useThemeStore } from "@/lib/store/theme.store";
import { ApolloProvider } from "@apollo/client/react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrateTheme = useThemeStore((state) => state.hydrate);

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
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(app)");
    }
  }, [token, isHydrated, segments, router]);

  // Block render until SecureStore has been read.
  // Prevents flash of wrong screen on cold boot.
  if (!isHydrated) return null;

  // Render-time gate: prevent (app) children from mounting and firing
  // unauthenticated queries between token becoming null and the redirect
  // effect firing. Mirror the same group detection used by the effect.
  const inAuthGroup = segments[0] === "(auth)";
  if (!token && !inAuthGroup) return null;
  if (token && inAuthGroup) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <AuthGuard>
          <StatusBar style="auto" />
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

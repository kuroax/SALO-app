import { useAuthStore } from "@/lib/store/auth.store";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "../global.css";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrate = useAuthStore((state) => state.hydrate);
  const segments = useSegments();
  const router = useRouter();

  // Hydrate once on mount — reads SecureStore and sets token + isHydrated.
  // hydrate() is idempotent: safe if called more than once (Strict Mode / dev).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect based on auth state — only runs after hydration is complete.
  // router and segments included in deps per exhaustive-deps convention.
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(app)");
    }
    // TODO: treat stored token as provisional — add forced logout on
    // unrecoverable 401 once refreshLink is wired in Apollo client.
  }, [token, isHydrated, segments, router]);

  // Block render until SecureStore has been read.
  // Prevents flash of wrong screen on cold boot.
  if (!isHydrated) return null;

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthGuard>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AuthGuard>
  );
}

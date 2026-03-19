import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

// ─── Summary Card ─────────────────────────────────────────────────────────────

type SummaryCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
};

// mb-3 lives on the wrapper View — spacing is a layout concern,
// not a Card concern.
function SummaryCard({ title, value, subtitle }: SummaryCardProps) {
  return (
    <View className="mb-3">
      <Card variant="white" padding="md">
        <Text className="mb-1 text-sm font-medium text-gray-500">{title}</Text>
        <Text className="text-2xl font-bold text-gray-900">
          {String(value)}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-xs text-gray-400">{subtitle}</Text>
        ) : null}
      </Card>
    </View>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout();
      // AuthGuard redirects to login once token is cleared in Zustand.
    } catch (error) {
      // TODO: replace with toast notification when notification system is in place.
      console.error("Logout failed:", error);
    } finally {
      // Always reset — prevents button staying permanently disabled if logout throws.
      setIsLoggingOut(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      {/* TODO: replace pt-14 with SafeAreaView when building header component. */}
      <View className="bg-white px-5 pb-5 pt-14">
        <Text className="text-2xl font-bold text-gray-900">SALO</Text>
        <Text className="mt-0.5 text-sm text-gray-500">Owner Dashboard</Text>
      </View>

      <View className="px-5 pt-5">
        {/* ── Summary cards ───────────────────────────────────────────────── */}
        {/* TODO (Phase B): replace placeholder values with Apollo queries.    */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Overview
        </Text>

        <SummaryCard
          title="Pending Orders"
          value="--"
          subtitle="Awaiting confirmation"
        />
        <SummaryCard
          title="Today's Orders"
          value="--"
          subtitle="Orders placed today"
        />
        <SummaryCard
          title="Low Stock Alerts"
          value="--"
          subtitle="Items below threshold"
        />
        <SummaryCard
          title="Recent Activity"
          value="--"
          subtitle="Last 24 hours"
        />

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Manage
        </Text>

        <View className="mb-3">
          <Button
            variant="primary"
            fullWidth
            onPress={() => router.navigate("/orders")}
          >
            Orders
          </Button>
        </View>

        <View className="mb-3">
          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.navigate("/inventory")}
          >
            Inventory
          </Button>
        </View>

        <View className="mb-3">
          <Button
            variant="secondary"
            fullWidth
            onPress={() => router.navigate("/customers")}
          >
            Customers
          </Button>
        </View>

        {/* ── Logout ──────────────────────────────────────────────────────── */}
        <View className="mt-6">
          <Button
            variant="danger"
            fullWidth
            loading={isLoggingOut}
            onPress={handleLogout}
          >
            Logout
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}

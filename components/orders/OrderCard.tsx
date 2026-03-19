import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
type PaymentStatus = "unpaid" | "partial" | "paid";

type OrderCardProps = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
  customerId: string | null;
  // Total units across all line items (sum of item.quantity), not line item count.
  itemCount: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderCard({
  id,
  orderNumber,
  status,
  paymentStatus,
  total,
  createdAt,
  customerId,
  itemCount,
}: OrderCardProps) {
  const router = useRouter();

  return (
    <View className="mb-3">
      <Card
        variant="white"
        padding="md"
        onPress={() =>
          router.push({
            pathname: "/orders/[id]",
            params: { id },
          })
        }
      >
        {/* ── Top row: order number + total ─────────────────────────────── */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text
            numberOfLines={1}
            className="flex-1 text-sm font-bold text-gray-900"
          >
            {orderNumber}
          </Text>
          <Text className="ml-3 text-base font-bold text-gray-900">
            {formatCurrency(total)}
          </Text>
        </View>

        {/* ── Middle row: badges ────────────────────────────────────────── */}
        <View className="mb-3 flex-row gap-2">
          <Badge status={status} />
          <Badge status={paymentStatus} />
        </View>

        {/* ── Bottom row: meta info ─────────────────────────────────────── */}
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-gray-400">
            {customerId ? "Customer assigned" : "No customer"}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-gray-400">
              {itemCount} {itemCount === 1 ? "unit" : "units"}
            </Text>
            <Text className="text-xs text-gray-400">
              {formatDate(createdAt)}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

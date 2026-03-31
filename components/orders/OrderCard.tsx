import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useColors } from "@/lib/hooks/useColors";
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
  const C = useColors();
  const router = useRouter();

  return (
    <View style={{ marginBottom: 12 }}>
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.textPrimary }}
          >
            {orderNumber}
          </Text>
          <Text style={{ marginLeft: 12, fontSize: 15, fontWeight: "700", color: C.textPrimary }}>
            {formatCurrency(total)}
          </Text>
        </View>

        {/* ── Middle row: badges ────────────────────────────────────────── */}
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <View style={{ marginRight: 8 }}>
            <Badge status={status} />
          </View>
          <Badge status={paymentStatus} />
        </View>

        {/* ── Bottom row: meta info ─────────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: C.textTertiary }}>
            {customerId ? "Customer assigned" : "No customer"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: C.textTertiary }}>
              {itemCount} {itemCount === 1 ? "unit" : "units"}
            </Text>
            <View style={{ width: 12 }} />
            <Text style={{ fontSize: 12, color: C.textTertiary }}>
              {formatDate(createdAt)}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

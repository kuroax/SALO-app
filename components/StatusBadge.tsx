import { Text, View } from "react-native";

// ─── Order status ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export type InventoryStatus = "active" | "inactive" | "out_of_stock";

export type BadgeVariant = OrderStatus | PaymentStatus | InventoryStatus;

// ─── Color maps ───────────────────────────────────────────────────────────────

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  confirmed: "#6366f1",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid: "#ef4444",
  partial: "#f59e0b",
  paid: "#10b981",
};

export const INVENTORY_STATUS_COLORS: Record<InventoryStatus, string> = {
  active: "#10b981",
  inactive: "#9a9284",
  out_of_stock: "#ef4444",
};

// ─── Label overrides (for display) ───────────────────────────────────────────

const LABEL_OVERRIDES: Partial<Record<BadgeVariant, string>> = {
  out_of_stock: "Out of stock",
};

// ─── Resolve color ────────────────────────────────────────────────────────────

function resolveColor(variant: BadgeVariant, customColor?: string): string {
  if (customColor) return customColor;
  if (variant in ORDER_STATUS_COLORS)
    return ORDER_STATUS_COLORS[variant as OrderStatus];
  if (variant in PAYMENT_STATUS_COLORS)
    return PAYMENT_STATUS_COLORS[variant as PaymentStatus];
  if (variant in INVENTORY_STATUS_COLORS)
    return INVENTORY_STATUS_COLORS[variant as InventoryStatus];
  return "#9a9284";
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  /** One of the known status strings, or pass any string + a customColor */
  status: BadgeVariant | string;
  /** Override the resolved color (useful for custom one-off badges) */
  color?: string;
  /** Override the display label (defaults to capitalized status string) */
  label?: string;
  /** Badge size. Default: "md" */
  size?: "sm" | "md";
};

/**
 * StatusBadge
 * Colored pill badge for order, payment, and inventory statuses.
 * Color maps are exported so screens can use them directly too.
 *
 * Usage:
 *   <StatusBadge status={order.status} />
 *   <StatusBadge status={order.paymentStatus} />
 *   <StatusBadge status="custom" color="#3b82f6" label="In Transit" />
 */
export function StatusBadge({ status, color, label, size = "md" }: Props) {
  const resolvedColor = resolveColor(status as BadgeVariant, color);
  const displayLabel =
    label ??
    LABEL_OVERRIDES[status as BadgeVariant] ??
    status.replace(/_/g, " ");

  const isSmall = size === "sm";

  return (
    <View
      style={{
        backgroundColor: resolvedColor + "18",
        borderRadius: 6,
        paddingHorizontal: isSmall ? 6 : 8,
        paddingVertical: isSmall ? 2 : 3,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontSize: isSmall ? 10 : 11,
          fontWeight: "700",
          color: resolvedColor,
          textTransform: "capitalize",
        }}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

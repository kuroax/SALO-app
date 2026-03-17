import { Text, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

// Status values mirror backend enums exactly.
// Order statuses from ORDER_STATUSES constant.
// Payment statuses from PAYMENT_STATUSES constant.
type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";
type PaymentStatus = "unpaid" | "partial" | "paid";
type BadgeStatus = OrderStatus | PaymentStatus;

type BadgeColor =
  | "amber"
  | "blue"
  | "indigo"
  | "purple"
  | "green"
  | "red"
  | "gray";

type StatusBadgeProps = {
  status: BadgeStatus;
  label?: never;
  color?: never;
};

type CustomBadgeProps = {
  status?: never;
  label: string;
  color: BadgeColor;
};

type BadgeProps = StatusBadgeProps | CustomBadgeProps;

// ─── Status maps ──────────────────────────────────────────────────────────────

const statusLabels: Record<BadgeStatus, string> = {
  // Order statuses
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  // Payment statuses
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

const statusColors: Record<BadgeStatus, BadgeColor> = {
  // Order statuses
  pending: "amber",
  confirmed: "blue",
  processing: "indigo",
  shipped: "purple",
  delivered: "green",
  cancelled: "red",
  // Payment statuses
  unpaid: "red",
  partial: "amber",
  paid: "green",
};

// ─── Color styles ─────────────────────────────────────────────────────────────

const colorStyles: Record<BadgeColor, { container: string; label: string }> = {
  amber: {
    container: "bg-amber-50 border border-amber-200",
    label: "text-amber-700",
  },
  blue: {
    container: "bg-blue-50 border border-blue-200",
    label: "text-blue-700",
  },
  indigo: {
    container: "bg-indigo-50 border border-indigo-200",
    label: "text-indigo-700",
  },
  purple: {
    container: "bg-purple-50 border border-purple-200",
    label: "text-purple-700",
  },
  green: {
    container: "bg-green-50 border border-green-200",
    label: "text-green-700",
  },
  red: { container: "bg-red-50 border border-red-200", label: "text-red-700" },
  gray: {
    container: "bg-gray-100 border border-gray-200",
    label: "text-gray-600",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({ status, label, color }: BadgeProps) {
  const resolvedLabel = status ? statusLabels[status] : label;
  const resolvedColor = status ? statusColors[status] : color;

  const { container, label: labelStyle } = colorStyles[resolvedColor];

  return (
    <View
      className={["rounded-lg px-2.5 py-1 self-start", container].join(" ")}
    >
      <Text
        className={["text-xs font-semibold tracking-wide", labelStyle].join(
          " ",
        )}
      >
        {resolvedLabel}
      </Text>
    </View>
  );
}

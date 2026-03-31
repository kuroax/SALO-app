import { useColors } from "@/lib/hooks/useColors";
import { Text, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

// Status values mirror backend enums exactly.
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
  pending:    "Pending",
  confirmed:  "Confirmed",
  processing: "Processing",
  shipped:    "Shipped",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
  unpaid:     "Unpaid",
  partial:    "Partial",
  paid:       "Paid",
};

const statusColors: Record<BadgeStatus, BadgeColor> = {
  pending:    "amber",
  confirmed:  "blue",
  processing: "indigo",
  shipped:    "purple",  // no purple token — maps to accent below
  delivered:  "green",
  cancelled:  "red",
  unpaid:     "red",
  partial:    "amber",
  paid:       "green",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Badge({ status, label, color }: BadgeProps) {
  const C = useColors();

  const resolvedLabel = status ? statusLabels[status] : label;
  const resolvedColor = status ? statusColors[status] : color;

  // Map semantic color names to theme tokens.
  // "purple" (shipped) uses accent as the closest available token.
  const colorMap: Record<BadgeColor, { bg: string; text: string; border: string }> = {
    amber:  { bg: C.pendingBg,   text: C.pending,       border: C.pending + "40" },
    blue:   { bg: C.todayBg,     text: C.today,         border: C.today + "40" },
    indigo: { bg: C.todayBg,     text: C.today,         border: C.today + "40" },
    purple: { bg: C.accentMuted, text: C.accent,        border: C.accent + "40" },
    green:  { bg: C.successBg,   text: C.success,       border: C.success + "40" },
    red:    { bg: C.alertBg,     text: C.alert,         border: C.alert + "40" },
    gray:   { bg: C.accentMuted, text: C.textSecondary, border: C.border },
  };

  const { bg, text, border } = colorMap[resolvedColor];

  return (
    <View
      style={{
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0.3,
          color: text,
        }}
      >
        {resolvedLabel}
      </Text>
    </View>
  );
}

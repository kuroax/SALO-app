import { useColors } from "@/lib/hooks/useColors";
import { type ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  label: string;
  /** String value OR any ReactNode (e.g. a StatusBadge, a View with icons) */
  value: string | ReactNode;
  /** When true, omits the bottom border. Use on the last row in a Section. */
  last?: boolean;
  /** Align value to the right (default). Set false for stacked layout. */
  horizontal?: boolean;
};

/**
 * InfoRow
 * A single label → value row inside a Section card.
 *
 * Usage:
 *   <InfoRow label="Customer" value="Ana López" />
 *   <InfoRow label="Status" value={<StatusBadge status="pending" />} />
 *   <InfoRow label="Notes" value={order.notes ?? "—"} last />
 */
export function InfoRow({
  label,
  value,
  last = false,
  horizontal = true,
}: Props) {
  const C = useColors();

  return (
    <View
      style={{
        flexDirection: horizontal ? "row" : "column",
        alignItems: horizontal ? "center" : "flex-start",
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <Text
        style={{
          fontSize: 13,
          color: C.textSecondary,
          flex: horizontal ? 1 : undefined,
          marginBottom: horizontal ? 0 : 4,
        }}
      >
        {label}
      </Text>

      {typeof value === "string" ? (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: C.textPrimary,
            textAlign: horizontal ? "right" : "left",
            flexShrink: 1,
          }}
        >
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}

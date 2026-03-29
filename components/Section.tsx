import { useColors } from "@/lib/hooks/useColors";
import { type ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  title: string;
  children: ReactNode;
  /** Extra margin below the section. Default: 24 */
  marginBottom?: number;
  /** Optional right-side accessory (e.g. an edit button) */
  accessory?: ReactNode;
};

/**
 * Section
 * Renders an uppercase label + bordered card container.
 *
 * Usage:
 *   <Section title="Order Details">
 *     <InfoRow label="Customer" value="Ana López" />
 *     <InfoRow label="Total" value="$2,190.00" last />
 *   </Section>
 */
export function Section({
  title,
  children,
  marginBottom = 24,
  accessory,
}: Props) {
  const C = useColors();

  return (
    <View style={{ marginBottom }}>
      {/* Label row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1,
            color: C.textTertiary,
            textTransform: "uppercase",
          }}
        >
          {title}
        </Text>
        {accessory ?? null}
      </View>

      {/* Card */}
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.border,
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

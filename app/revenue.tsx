import { type ThemeColors } from "@/constants/Colors";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ─── Query ────────────────────────────────────────────────────────────────────

const REVENUE_DETAIL = gql`
  query RevenueDetail {
    revenueDetail(months: 12, topProductsLimit: 10) {
      monthlyStats {
        year
        month
        label
        revenue
        orderCount
      }
      paymentBreakdown {
        paid {
          count
          revenue
        }
        partial {
          count
          revenue
        }
        unpaid {
          count
          revenue
        }
      }
      topProducts {
        productId
        productName
        revenue
        unitsSold
      }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthStat = {
  year: number;
  month: number;
  label: string;
  revenue: number;
  orderCount: number;
};

type BreakdownItem = { count: number; revenue: number };

type PaymentBreakdown = {
  paid: BreakdownItem;
  partial: BreakdownItem;
  unpaid: BreakdownItem;
};

type ProductRevenue = {
  productId: string;
  productName: string;
  revenue: number;
  unitsSold: number;
};

type RevenueDetail = {
  monthlyStats: MonthStat[];
  paymentBreakdown: PaymentBreakdown;
  topProducts: ProductRevenue[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ title, C }: { title: string; C: ThemeColors }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1.5,
        color: C.textTertiary,
        textTransform: "uppercase",
        marginBottom: 12,
        marginTop: 28,
      }}
    >
      {title}
    </Text>
  );
}

// ─── Monthly Bar Chart ────────────────────────────────────────────────────────

function MonthlyChart({ data, C }: { data: MonthStat[]; C: ThemeColors }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          {data.map((item, i) => {
            const isCurrent =
              item.year === currentYear && item.month === currentMonth;
            const barHeight = Math.max(
              4,
              Math.round((item.revenue / maxRevenue) * 100),
            );
            return (
              <View
                key={`${item.year}-${item.month}`}
                style={{
                  alignItems: "center",
                  marginRight: i < data.length - 1 ? 12 : 0,
                  width: 52,
                }}
              >
                {/* Amount label */}
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "600",
                    color: isCurrent ? C.accent : C.textTertiary,
                    marginBottom: 4,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {item.revenue > 0 ? fmt.format(item.revenue) : "—"}
                </Text>

                {/* Bar */}
                <View
                  style={{
                    width: 36,
                    height: barHeight,
                    borderRadius: 6,
                    backgroundColor: isCurrent ? C.accent : C.accentMuted,
                  }}
                />

                {/* Order count */}
                {item.orderCount > 0 && (
                  <Text
                    style={{
                      fontSize: 9,
                      color: isCurrent ? C.accent : C.textTertiary,
                      marginTop: 3,
                    }}
                  >
                    {item.orderCount} {item.orderCount === 1 ? "ord" : "ords"}
                  </Text>
                )}

                {/* Month label */}
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: isCurrent ? "700" : "500",
                    color: isCurrent ? C.textPrimary : C.textTertiary,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Payment Breakdown ────────────────────────────────────────────────────────

function PaymentBreakdownCard({
  data,
  C,
}: {
  data: PaymentBreakdown;
  C: ThemeColors;
}) {
  const total = data.paid.revenue + data.partial.revenue + data.unpaid.revenue;

  const items = [
    {
      label: "Paid",
      color: C.success,
      bg: C.successBg,
      count: data.paid.count,
      revenue: data.paid.revenue,
    },
    {
      label: "Partial",
      color: C.today,
      bg: C.todayBg,
      count: data.partial.count,
      revenue: data.partial.revenue,
    },
    {
      label: "Unpaid",
      color: C.alert,
      bg: C.alertBg,
      count: data.unpaid.count,
      revenue: data.unpaid.revenue,
    },
  ];

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        overflow: "hidden",
      }}
    >
      {/* Progress bar */}
      {total > 0 && (
        <View
          style={{
            flexDirection: "row",
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            margin: 16,
            marginBottom: 0,
            backgroundColor: C.border,
          }}
        >
          {items.map((item) => {
            const pct = total > 0 ? (item.revenue / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <View
                key={item.label}
                style={{
                  width: `${pct}%`,
                  backgroundColor: item.color,
                }}
              />
            );
          })}
        </View>
      )}

      {/* Rows */}
      {items.map((item, i) => (
        <View
          key={item.label}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: i < items.length - 1 ? 1 : 0,
            borderBottomColor: C.border,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: item.color,
              marginRight: 10,
            }}
          />
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: "600",
              color: C.textPrimary,
            }}
          >
            {item.label}
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{ fontSize: 14, fontWeight: "700", color: item.color }}
            >
              {fmt.format(item.revenue)}
            </Text>
            <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: 1 }}>
              {item.count} {item.count === 1 ? "order" : "orders"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Top Products ─────────────────────────────────────────────────────────────

function TopProductsCard({
  data,
  C,
}: {
  data: ProductRevenue[];
  C: ThemeColors;
}) {
  if (!data.length) return null;

  const maxRevenue = Math.max(...data.map((p) => p.revenue), 1);

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        overflow: "hidden",
      }}
    >
      {data.map((product, i) => {
        const pct = (product.revenue / maxRevenue) * 100;
        return (
          <View
            key={product.productId}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderBottomWidth: i < data.length - 1 ? 1 : 0,
              borderBottomColor: C.border,
            }}
          >
            {/* Rank + name + revenue */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: i === 0 ? C.accent : C.textTertiary,
                  width: 22,
                }}
              >
                #{i + 1}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: "600",
                  color: C.textPrimary,
                }}
                numberOfLines={1}
              >
                {product.productName}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: C.textPrimary,
                  marginLeft: 8,
                }}
              >
                {fmt.format(product.revenue)}
              </Text>
            </View>

            {/* Bar + units */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: C.border,
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: i === 0 ? C.accent : C.accentMuted,
                      width: `${pct}%`,
                    }}
                  />
                </View>
              </View>
              <Text style={{ fontSize: 11, color: C.textTertiary }}>
                {product.unitsSold} units
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Revenue Screen ───────────────────────────────────────────────────────────

export default function RevenueScreen() {
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const { data, loading, error } = useQuery<{ revenueDetail: RevenueDetail }>(
    REVENUE_DETAIL,
  );

  const detail = data?.revenueDetail;

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <View style={{ flex: 1, backgroundColor: C.background }}>
        {/* ── Header ────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "800",
              color: C.textPrimary,
              letterSpacing: -0.3,
            }}
          >
            Revenue
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: C.surface,
              borderWidth: 1,
              borderColor: C.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Content ───────────────────────────────────────────────── */}
        {loading && !detail ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : error ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <Ionicons
              name="alert-circle-outline"
              size={36}
              color={C.alert}
              style={{ marginBottom: 8 }}
            />
            <Text
              style={{
                fontSize: 14,
                color: C.textTertiary,
                textAlign: "center",
              }}
            >
              {error.message}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 60,
            }}
          >
            {/* Monthly breakdown */}
            <SectionLabel title="Last 12 Months" C={C} />
            {detail?.monthlyStats && (
              <MonthlyChart data={detail.monthlyStats} C={C} />
            )}

            {/* Payment breakdown */}
            <SectionLabel title="Payment Status" C={C} />
            {detail?.paymentBreakdown && (
              <PaymentBreakdownCard data={detail.paymentBreakdown} C={C} />
            )}

            {/* Top products */}
            {detail?.topProducts && detail.topProducts.length > 0 && (
              <>
                <SectionLabel title="Top Products" C={C} />
                <TopProductsCard data={detail.topProducts} C={C} />
              </>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

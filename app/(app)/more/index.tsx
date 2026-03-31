import type { ThemeColors } from "@/constants/Colors";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { useAuthStore } from "@/lib/store/auth.store";
import { useThemeStore, type AccentKey } from "@/lib/store/theme.store";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const LIST_USERS = gql`
  query ListUsers {
    listUsers {
      id
      username
      email
      role
      isActive
      createdAt
    }
  }
`;

const DEACTIVATE_USER = gql`
  mutation DeactivateUser($id: ID!) {
    deactivateUser(id: $id)
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

type TeamMember = {
  id: string;
  username: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  sales: "Sales",
  inventory: "Inventory",
  support: "Support",
};

function getRoleColor(role: string, C: ThemeColors): string {
  switch (role) {
    case "owner":     return C.pending;
    case "admin":     return C.today;
    case "sales":     return C.success;
    case "inventory": return C.today;
    case "support":   return C.accent;
    default:          return C.textSecondary;
  }
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
  C,
}: {
  title: string;
  children: React.ReactNode;
  C: ThemeColors;
}) {
  return (
    <View style={{ marginBottom: 28 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: C.textTertiary,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function Row({
  icon,
  label,
  right,
  onPress,
  destructive,
  C,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  C: ThemeColors;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          backgroundColor: destructive ? C.alertBg : C.accentMuted,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Ionicons
          name={icon}
          size={17}
          color={destructive ? C.alert : C.accent}
        />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "500",
          color: destructive ? C.alert : C.textPrimary,
        }}
      >
        {label}
      </Text>
      {right ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
        ) : null)}
    </TouchableOpacity>
  );
}

// ─── Team Member Row ──────────────────────────────────────────────────────────

function TeamMemberRow({
  member,
  onDeactivate,
  C,
  last,
}: {
  member: TeamMember;
  onDeactivate: (id: string, username: string) => void;
  C: ThemeColors;
  last: boolean;
}) {
  const roleColor = getRoleColor(member.role, C);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: roleColor + "20",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: roleColor }}>
          {member.username[0].toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: C.textPrimary }}>
          {member.username}
        </Text>
        <View
          style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}
        >
          <View
            style={{
              backgroundColor: roleColor + "20",
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: roleColor }}>
              {ROLE_LABELS[member.role] ?? member.role}
            </Text>
          </View>
          {member.email && (
            <Text
              style={{ fontSize: 11, color: C.textTertiary, marginLeft: 8 }}
              numberOfLines={1}
            >
              {member.email}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => onDeactivate(member.id, member.username)}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: C.alertBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="person-remove-outline" size={14} color={C.alert} />
      </TouchableOpacity>
    </View>
  );
}

// ─── More Screen ──────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const accentKey = useThemeStore((s) => s.accentKey);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setColorScheme = useThemeStore((s) => s.setColorScheme);

  const C = useColors();
  const scheme = useScheme();

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { data: teamData, refetch: refetchTeam } = useQuery<{
    listUsers: TeamMember[];
  }>(LIST_USERS, { skip: !isOwnerOrAdmin });
  const [deactivateUser] = useMutation(DEACTIVATE_USER, {
    onCompleted: () => refetchTeam(),
  });

  const handleDeactivate = (id: string, username: string) => {
    Alert.alert(
      "Remove team member",
      `Remove @${username}? They will lose access immediately.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deactivateUser({ variables: { id } }),
        },
      ],
    );
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          await logout();
          setIsLoggingOut(false);
        },
      },
    ]);
  };

  const members = teamData?.listUsers ?? [];

  const swatches: { key: AccentKey; darkColor: string; lightColor: string }[] =
    [
      { key: "sky", darkColor: "#38bdf8", lightColor: "#0284c7" },
      { key: "amber", darkColor: "#f59e0b", lightColor: "#d97706" },
      { key: "indigo", darkColor: "#818cf8", lightColor: "#4f46e5" },
      { key: "rose", darkColor: "#fb7185", lightColor: "#e11d48" },
      { key: "emerald", darkColor: "#34d399", lightColor: "#059669" },
    ];

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View
          style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 }}
        >
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: C.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            More
          </Text>
          <View
            style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}
          >
            <View
              style={{
                backgroundColor: C.accentMuted,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginRight: 8,
              }}
            >
              <Text
                style={{ fontSize: 11, fontWeight: "700", color: C.accent }}
              >
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>
              @{user?.username}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {/* Appearance */}
          <Section title="Appearance" C={C}>
            {/* Dark mode toggle */}
            <Row
              icon="moon-outline"
              label="Dark Mode"
              C={C}
              right={
                <Switch
                  value={scheme === "dark"}
                  onValueChange={(val) =>
                    setColorScheme(val ? "dark" : "light")
                  }
                  trackColor={{ false: C.border, true: C.accent }}
                  thumbColor={C.surface}
                />
              }
            />

            {/* Accent color picker */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: C.border,
                paddingHorizontal: 16,
                paddingTop: 14,
                paddingBottom: 18,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: C.textSecondary,
                  marginBottom: 16,
                }}
              >
                Accent Color
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {swatches.map((s) => {
                  const color = scheme === "dark" ? s.darkColor : s.lightColor;
                  const selected = accentKey === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setAccent(s.key)}
                      activeOpacity={0.75}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: color,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                        borderWidth: selected ? 3 : 0,
                        borderColor: C.surface,
                      }}
                    >
                      {selected && (
                        <Ionicons name="checkmark" size={20} color={C.surface} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Section>

          {/* Notifications */}
          <Section title="Notifications" C={C}>
            <Row
              icon="notifications-outline"
              label="Push Notifications"
              C={C}
              last
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: C.border, true: C.accent }}
                  thumbColor={C.surface}
                />
              }
            />
          </Section>

          {/* Team */}
          {isOwnerOrAdmin && (
            <Section title="Team" C={C}>
              {members.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: C.textTertiary }}>
                    No team members yet
                  </Text>
                </View>
              ) : (
                members.map((m, i) => (
                  <TeamMemberRow
                    key={m.id}
                    member={m}
                    onDeactivate={handleDeactivate}
                    C={C}
                    last={i === members.length - 1}
                  />
                ))
              )}
              <TouchableOpacity
                onPress={() => router.push("/more/add-member")}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                }}
              >
                <Ionicons
                  name="person-add-outline"
                  size={16}
                  color={C.accent}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: C.accent }}
                >
                  Add Team Member
                </Text>
              </TouchableOpacity>
            </Section>
          )}

          {/* Account */}
          <Section title="Account" C={C}>
            <Row
              icon="key-outline"
              label="Change Password"
              onPress={() => router.push("/more/change-password")}
              C={C}
            />
            <Row
              icon="log-out-outline"
              label={isLoggingOut ? "Logging out…" : "Log Out"}
              onPress={handleLogout}
              destructive
              C={C}
              last
            />
          </Section>

          <Text
            style={{
              textAlign: "center",
              fontSize: 11,
              color: C.textTertiary,
              marginTop: 8,
            }}
          >
            SALO · Private Distribution
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

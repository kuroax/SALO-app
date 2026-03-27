import { Colors, type ThemeColors } from "@/constants/Colors";
import { useAuthStore } from "@/lib/store/auth.store";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StatusBar,
    Switch,
    Text,
    useColorScheme,
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

const ROLE_COLORS: Record<string, string> = {
  owner: "#f59e0b",
  admin: "#6366f1",
  sales: "#10b981",
  inventory: "#3b82f6",
  support: "#8b5cf6",
};

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
          overflow: "hidden",
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
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
        opacity: pressed ? 0.7 : 1,
      })}
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
    </Pressable>
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
  const roleColor = ROLE_COLORS[member.role] ?? C.textSecondary;

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
      {/* Avatar */}
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

      {/* Info */}
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
              style={{
                fontSize: 11,
                color: C.textTertiary,
                marginLeft: 8,
              }}
              numberOfLines={1}
            >
              {member.email}
            </Text>
          )}
        </View>
      </View>

      {/* Remove button */}
      <Pressable
        onPress={() => onDeactivate(member.id, member.username)}
        style={({ pressed }) => ({
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: C.alertBg,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons name="person-remove-outline" size={14} color={C.alert} />
      </Pressable>
    </View>
  );
}

// ─── More Screen ──────────────────────────────────────────────────────────────

export default function MoreScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";
  const C = Colors[scheme] as ThemeColors;

  const isOwnerOrAdmin = user?.role === "owner" || user?.role === "admin";

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ── Team data (owner/admin only) ──────────────────────────────────────────
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

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 20,
          }}
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

          {/* Logged in as */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
              gap: 8,
            }}
          >
            <View
              style={{
                backgroundColor: C.accentMuted,
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 3,
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
          {/* ── Appearance ────────────────────────────────────────────── */}
          <Section title="Appearance" C={C}>
            <Row
              icon="moon-outline"
              label="Dark Mode"
              C={C}
              last
              right={
                <Switch
                  value={scheme === "dark"}
                  disabled
                  // System-controlled — shows current state.
                  // Full manual override requires a theme store (future enhancement).
                  trackColor={{ false: C.border, true: C.accent }}
                  thumbColor={C.textPrimary}
                />
              }
            />
          </Section>

          {/* ── Notifications ─────────────────────────────────────────── */}
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
                  thumbColor={C.textPrimary}
                />
              }
            />
          </Section>

          {/* ── Team (owner/admin only) ───────────────────────────────── */}
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

              {/* Add member button */}
              <Pressable
                onPress={() => router.push("/more/add-member")}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 14,
                  borderTopWidth: 1,
                  borderTopColor: C.border,
                  gap: 8,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons
                  name="person-add-outline"
                  size={16}
                  color={C.accent}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: C.accent }}
                >
                  Add Team Member
                </Text>
              </Pressable>
            </Section>
          )}

          {/* ── Account ───────────────────────────────────────────────── */}
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

          {/* ── App info ──────────────────────────────────────────────── */}
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

import { Colors, type ThemeColors } from "@/constants/Colors";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    useColorScheme,
    View,
} from "react-native";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const REGISTER_USER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      user {
        id
        username
        role
      }
    }
  }
`;

// ─── Role options ─────────────────────────────────────────────────────────────

const ROLES = [
  {
    value: "sales",
    label: "Sales",
    description: "Can manage orders and customers",
  },
  {
    value: "inventory",
    label: "Inventory",
    description: "Can manage products and stock",
  },
  {
    value: "support",
    label: "Support",
    description: "Can view orders and customers",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full access except owner settings",
  },
] as const;

type RoleValue = (typeof ROLES)[number]["value"];

// ─── Input Field ──────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  C: ThemeColors;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: C.textSecondary,
          marginBottom: 6,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        style={{
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 12,
          paddingVertical: 13,
          paddingHorizontal: 16,
          fontSize: 15,
          color: C.textPrimary,
        }}
      />
    </View>
  );
}

// ─── Add Member Screen ────────────────────────────────────────────────────────

export default function AddMemberScreen() {
  const router = useRouter();

  const raw = useColorScheme();
  const scheme: "light" | "dark" = raw === "light" ? "light" : "dark";
  const C = Colors[scheme] as ThemeColors;

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleValue>("sales");

  const [register, { loading }] = useMutation(REGISTER_USER, {
    onCompleted: () => {
      Alert.alert(
        "Member added",
        `@${username} can now log in with the credentials you provided.`,
        [{ text: "Done", onPress: () => router.back() }],
      );
    },
    onError: (err) => {
      Alert.alert("Error", err.message);
    },
  });

  const handleSubmit = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert("Required", "Username and password are required.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Weak password", "Password must be at least 8 characters.");
      return;
    }

    register({
      variables: {
        input: {
          username: username.trim().toLowerCase(),
          password,
          email: email.trim() || undefined,
          role,
        },
      },
    });
  };

  return (
    <>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── Header ────────────────────────────────────────────────── */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 64,
              paddingBottom: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: C.surface,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="arrow-back" size={18} color={C.textPrimary} />
            </Pressable>
            <View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: C.textPrimary,
                  letterSpacing: -0.5,
                }}
              >
                Add Team Member
              </Text>
              <Text
                style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}
              >
                They'll use these credentials to log in
              </Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            {/* ── Fields ──────────────────────────────────────────────── */}
            <Field
              label="USERNAME"
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. maria_ventas"
              C={C}
            />
            <Field
              label="PASSWORD"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              secureTextEntry
              C={C}
            />
            <Field
              label="EMAIL (optional)"
              value={email}
              onChangeText={setEmail}
              placeholder="maria@example.com"
              C={C}
            />

            {/* ── Role picker ───────────────────────────────────────── */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: C.textSecondary,
                marginBottom: 10,
                letterSpacing: 0.3,
              }}
            >
              ROLE
            </Text>

            <View style={{ gap: 8, marginBottom: 28 }}>
              {ROLES.map((r) => {
                const selected = role === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setRole(r.value)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: selected ? C.accentMuted : C.surface,
                      borderRadius: 12,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: selected ? C.accent : C.border,
                      opacity: pressed ? 0.8 : 1,
                      gap: 12,
                    })}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: selected ? C.accent : C.border,
                        backgroundColor: selected ? C.accent : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected && (
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color={C.background}
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: selected ? C.accent : C.textPrimary,
                        }}
                      >
                        {r.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: C.textTertiary,
                          marginTop: 1,
                        }}
                      >
                        {r.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Submit ────────────────────────────────────────────── */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                opacity: pressed || loading ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#0c0c0c",
                }}
              >
                {loading ? "Creating…" : "Create Member"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

import { type ThemeColors } from "@/constants/Colors";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`;

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  C,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  C: ThemeColors;
}) {
  const [visible, setVisible] = useState(false);

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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: C.surface,
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 12,
          paddingHorizontal: 16,
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textTertiary}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            paddingVertical: 13,
            fontSize: 15,
            color: C.textPrimary,
          }}
        />
        <TouchableOpacity
          onPress={() => setVisible((v) => !v)}
          activeOpacity={0.7}
          style={{ padding: 4 }}
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={C.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Change Password Screen ───────────────────────────────────────────────────

export default function ChangePasswordScreen() {
  const router = useRouter();
  const C = useColors();
  const scheme = useScheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD, {
    onCompleted: () => {
      Alert.alert(
        "Password changed",
        "Your password has been updated successfully.",
        [{ text: "Done", onPress: () => router.back() }],
      );
    },
    onError: (err: Error) => Alert.alert("Error", err.message),
  });

  const handleSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Required", "Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert(
        "Weak password",
        "New password must be at least 8 characters.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "New password and confirmation do not match.");
      return;
    }
    changePassword({
      variables: { input: { currentPassword, newPassword, confirmPassword } },
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
          {/* ── Header ──────────────────────────────────────────────── */}
          <View
            style={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20 }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
                marginBottom: 32,
              }}
            >
              <Ionicons name="arrow-back" size={16} color={C.accent} />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: C.accent,
                  marginLeft: 4,
                }}
              >
                More
              </Text>
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: C.textPrimary,
                letterSpacing: -0.5,
              }}
            >
              Change Password
            </Text>
            <Text
              style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}
            >
              Update your account password
            </Text>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <Field
              label="CURRENT PASSWORD"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              C={C}
            />
            <Field
              label="NEW PASSWORD"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min. 8 characters"
              C={C}
            />
            <Field
              label="CONFIRM NEW PASSWORD"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat new password"
              C={C}
            />

            {/* ── Requirements hint ─────────────────────────────────── */}
            <View
              style={{
                backgroundColor: C.accentMuted,
                borderRadius: 10,
                padding: 12,
                marginBottom: 24,
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={C.accent}
                style={{ marginTop: 1, marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: C.textSecondary,
                  flex: 1,
                  lineHeight: 18,
                }}
              >
                Password must be at least 8 characters. Use a mix of letters and
                numbers for a stronger password.
              </Text>
            </View>

            {/* ── Submit ────────────────────────────────────────────── */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
              style={{
                backgroundColor: C.accent,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: scheme === "dark" ? "#0c0c0c" : "#ffffff",
                }}
              >
                {loading ? "Updating…" : "Update Password"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

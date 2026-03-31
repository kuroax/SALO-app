import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useColors, useScheme } from "@/lib/hooks/useColors";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  const C = useColors();
  const scheme = useScheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const passwordRef = useRef<TextInput>(null);

  const isFormValid = username.trim().length > 0 && password.length > 0;
  const isSubmitDisabled = isLoading || !isFormValid;

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;
    if (error) clearError();
    await login(username.trim(), password);
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (error) clearError();
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) clearError();
  };

  return (
    <>
      <StatusBar barStyle={scheme === "dark" ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Text
            style={{
              marginBottom: 4,
              fontSize: 30,
              fontWeight: "800",
              color: C.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            SALO
          </Text>
          <Text style={{ marginBottom: 40, fontSize: 15, color: C.textSecondary }}>
            Owner Dashboard
          </Text>

          {error ? (
            <View
              style={{
                marginBottom: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.alert + "40",
                backgroundColor: C.alertBg,
                padding: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: C.alert }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ marginBottom: 12 }}>
            <Input
              label="Username"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={{ marginBottom: 24 }}>
            <Input
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Button
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isSubmitDisabled}
            fullWidth
          >
            Sign In
          </Button>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

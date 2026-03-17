import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthStore } from "@/lib/store/auth.store";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
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
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="mb-1 text-3xl font-bold text-gray-900">SALO</Text>
        <Text className="mb-10 text-gray-500">Owner Dashboard</Text>

        {error ? (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        ) : null}

        <View className="mb-3">
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

        <View className="mb-6">
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
  );
}

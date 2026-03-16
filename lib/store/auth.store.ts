import { Config } from "@/constants/Config";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const ACCESS_TOKEN_KEY = "salo_access_token";
const REFRESH_TOKEN_KEY = "salo_refresh_token";

type AuthState = {
  token: string | null;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isHydrated: false,
  isLoading: false,
  error: null,

  // Reads SecureStore on app start — idempotent, safe to call more than once.
  // try/finally guarantees isHydrated is always set even if SecureStore throws,
  // preventing the AuthGuard from blocking forever on a blank screen.
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      set({ token });
    } catch {
      // Storage read failed — treat as unauthenticated, do not block startup.
      set({ token: null, error: "Failed to restore session." });
    } finally {
      set({ isHydrated: true });
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(Config.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation Login($input: LoginInput!) {
              login(input: $input) {
                accessToken
                refreshToken
                user { id username role }
              }
            }
          `,
          variables: { input: { username, password } },
        }),
      });

      // Validate HTTP layer before trusting the JSON body.
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const json = await response.json();
      const { data, errors } = json;

      if (errors?.length) throw new Error(errors[0].message);

      // Guard against unexpected response shape before writing to storage.
      const accessToken = data?.login?.accessToken;
      const refreshToken = data?.login?.refreshToken;

      if (!accessToken || !refreshToken) {
        throw new Error("Invalid response from server");
      }

      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      set({ token: accessToken, isLoading: false });

      // TODO (Phase B): store user.role here if role-aware UI is needed.
      // TODO (Phase B): implement token refresh using refreshToken.
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Login failed",
        isLoading: false,
      });
    }
  },

  // try/finally guarantees auth state is always cleared even if storage throws.
  // Clears error too so stale messages don't persist after logout.
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // Storage deletion failed — proceed with state cleanup anyway.
      // Token is cleared from memory so the user is effectively logged out.
    } finally {
      set({ token: null, error: null });
    }
  },

  // Called on input change to clear stale error messaging.
  clearError: () => set({ error: null }),
}));

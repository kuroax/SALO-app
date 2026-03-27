import { Config } from "@/constants/Config";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

const ACCESS_TOKEN_KEY = "salo_access_token";
const REFRESH_TOKEN_KEY = "salo_refresh_token";
const USER_KEY = "salo_user";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "admin" | "sales" | "inventory" | "support";

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null; // now persisted — role-gating reads from here
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setToken: (token: string) => void;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,
  isLoading: false,
  error: null,

  // Restores both the access token and the cached user from SecureStore.
  // Merged into a single set() call to prevent split renders causing
  // AuthGuard redirect effect to fire before both fields are updated.
  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      const user: AuthUser | null = userJson ? JSON.parse(userJson) : null;
      set({ token, user, isHydrated: true });
    } catch {
      set({
        token: null,
        user: null,
        error: "Failed to restore session.",
        isHydrated: true,
      });
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

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const json = await response.json();
      const { data, errors } = json;

      if (errors?.length) throw new Error(errors[0].message);

      const accessToken = data?.login?.accessToken;
      const refreshToken = data?.login?.refreshToken;
      const rawUser = data?.login?.user;

      if (!accessToken || !refreshToken || !rawUser) {
        throw new Error("Invalid response from server");
      }

      const user: AuthUser = {
        id: rawUser.id,
        username: rawUser.username,
        role: rawUser.role,
      };

      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      set({ token: accessToken, user, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Login failed",
        isLoading: false,
      });
    }
  },

  // Calls the backend logout mutation first to increment tokenVersion,
  // then clears local tokens. This order ensures the refresh token is
  // invalidated server-side before being deleted from the device.
  logout: async () => {
    const currentToken = get().token;

    if (currentToken) {
      try {
        await fetch(Config.API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({ query: `mutation Logout { logout }` }),
        });
      } catch {
        // Network failure — proceed with local cleanup regardless.
      }
    }

    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // Storage deletion failed — proceed with state cleanup anyway.
    } finally {
      set({ token: null, user: null, error: null });
    }
  },

  // Called by refreshLink after a successful token refresh.
  setToken: (token: string) => set({ token }),

  // Called on input change to clear stale error messaging.
  clearError: () => set({ error: null }),
}));

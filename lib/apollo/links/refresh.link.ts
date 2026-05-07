import { Config } from "@/constants/Config";
import { useAuthStore } from "@/lib/store/auth.store";
import { Observable } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { onError } from "@apollo/client/link/error";
import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "salo_refresh_token";
const ACCESS_TOKEN_KEY = "salo_access_token";

// ─── Concurrent refresh serialization ────────────────────────────────────────
// Coalesces all concurrent token-refresh attempts onto a single in-flight
// promise. When several queries fire with an expired access token at the same
// time, every one of them hits a 401 and would otherwise independently call
// fetchNewAccessToken(). With rotating refresh tokens, only the first call
// succeeds — the others present an already-rotated refresh token, fail, and
// force a global logout for the user. By caching the in-flight promise at
// module scope, every concurrent caller awaits the same refresh and receives
// the same new access token. Do not remove this without replacing it with an
// equivalent serialization mechanism.
let refreshingPromise: Promise<string | null> | null = null;

function getOrCreateRefresh(): Promise<string | null> {
  if (refreshingPromise) return refreshingPromise;
  refreshingPromise = fetchNewAccessToken().finally(() => {
    refreshingPromise = null;
  });
  return refreshingPromise;
}

// Calls the refreshToken mutation directly via fetch to avoid
// circular dependency with the Apollo client instance.
async function fetchNewAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  if (!refreshToken) return null;

  const response = await fetch(Config.API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation RefreshToken($input: RefreshTokenInput!) {
          refreshToken(input: $input) {
            accessToken
          }
        }
      `,
      variables: { input: { refreshToken } },
    }),
  });

  if (!response.ok) return null;

  const json = await response.json();
  const accessToken = json?.data?.refreshToken?.accessToken;

  if (!accessToken) return null;

  // Persist new access token.
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  useAuthStore.getState().setToken(accessToken);

  return accessToken;
}

// Intercepts UNAUTHENTICATED errors, attempts silent token refresh,
// then retries the original operation with the new token.
// If refresh fails, logs the user out and clears auth state.
export const refreshLink = onError(({ error, operation, forward }) => {
  const isUnauthenticated =
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (err) =>
        (err.extensions as { code?: string } | undefined)?.code ===
        "UNAUTHENTICATED",
    );

  if (!isUnauthenticated) return;

  return new Observable((observer) => {
    getOrCreateRefresh()
      .then((newToken) => {
        if (!newToken) {
          // Refresh failed — force logout.
          useAuthStore.getState().logout();
          observer.error(new Error("Session expired. Please log in again."));
          return;
        }

        // Retry original operation with new token injected.
        operation.setContext(({ headers = {} }) => ({
          headers: {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          },
        }));

        forward(operation).subscribe(observer);
      })
      .catch(() => {
        useAuthStore.getState().logout();
        observer.error(new Error("Session expired. Please log in again."));
      });
  });
});

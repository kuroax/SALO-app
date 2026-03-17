import { Config } from "@/constants/Config";
import { useAuthStore } from "@/lib/store/auth.store";
import { Observable } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "salo_refresh_token";
const ACCESS_TOKEN_KEY = "salo_access_token";

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
export const refreshLink = onError(({ graphQLErrors, operation, forward }) => {
  const isUnauthenticated = graphQLErrors?.some(
    (err) => err.extensions?.code === "UNAUTHENTICATED",
  );

  if (!isUnauthenticated) return;

  return new Observable((observer) => {
    fetchNewAccessToken()
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

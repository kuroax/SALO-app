// constants/Config.ts
// Reads environment from EXPO_PUBLIC_ variables set in .env.development
// or .env.production. No hardcoded URLs, no platform-specific hacks.
//
// In development:  points to local backend (localhost:4000)
// In production:   points to Railway backend
//
// If the variable is missing, we throw at startup rather than silently
// making requests to undefined — fail loud, fail fast.

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    "[Config] EXPO_PUBLIC_API_URL is not set.\n" +
    "Create a .env.development file from .env.example and restart Expo.",
  );
}

export const Config = {
  API_URL: apiUrl,
  IS_DEV: process.env.EXPO_PUBLIC_APP_ENV !== "production",
} as const;

// app.config.js — dynamic Expo config
// Replaces app.json. Reads environment variables set in .env.development
// or .env.production (loaded automatically by Expo CLI / EAS Build).
//
// SETUP:
//   Development:  cp .env.example .env.development  (already filled for local)
//   Production:   cp .env.example .env.production   (set Railway URL)
//
// The EXPO_PUBLIC_ prefix makes variables available at runtime via
// process.env. No extra package needed — Expo CLI handles this natively.

const IS_PROD = process.env.EXPO_PUBLIC_APP_ENV === "production";

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: IS_PROD ? "SALO" : "SALO (dev)",
    slug: "salo",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "saloapp",
    userInterfaceStyle: "automatic",

    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#0c0c0c",
    },

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.salo.app",
      buildNumber: "1",
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      package: "com.salo.app",
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: ["expo-router", "expo-secure-store"],

    experiments: {
      typedRoutes: true,
    },

    // Extra values accessible via Constants.expoConfig.extra at runtime
    extra: {
      appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/graphql",
      eas: {
        projectId: "d3cc25f9-590c-4522-893b-22c8fad80c45",
      },
    },
  },
};

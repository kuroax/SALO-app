import { Platform } from "react-native";

// On iOS simulator, localhost resolves to the host machine correctly.
// On a physical device or Android emulator, use your machine's LAN IP instead.
// TODO: replace with deployed backend URL for production builds.
const DEV_HOST = Platform.OS === "ios" ? "localhost" : "10.0.2.2";

export const Config = {
  API_URL: __DEV__
    ? `http://${DEV_HOST}:4000/api/graphql`
    : "https://your-production-url.com/api/graphql",
} as const;

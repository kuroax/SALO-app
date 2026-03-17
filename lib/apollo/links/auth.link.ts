import { useAuthStore } from "@/lib/store/auth.store";
import { ApolloLink } from "@apollo/client";

// Injects Authorization header on every outgoing request.
// Reads token from Zustand store (in-memory source of truth).
// If no token exists the request goes out without the header —
// the server will reject protected operations with UNAUTHENTICATED.
export const authLink = new ApolloLink((operation, forward) => {
  const token = useAuthStore.getState().token;

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }));

  return forward(operation);
});

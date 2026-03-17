import { Config } from "@/constants/Config";
import { authLink } from "@/lib/apollo/links/auth.link";
import { refreshLink } from "@/lib/apollo/links/refresh.link";
import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";

const httpLink = new HttpLink({
  uri: Config.API_URL,
});

// Link chain: refreshLink → authLink → httpLink
// refreshLink intercepts auth errors and retries after token refresh.
// authLink injects the Authorization header on every request.
// httpLink sends the request to the backend.
export const apolloClient = new ApolloClient({
  link: from([refreshLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      // Normalize Order by id field.
      Order: {
        keyFields: ["id"],
      },
      // Normalize Customer by id field.
      Customer: {
        keyFields: ["id"],
      },
      // Normalize Product by id field.
      Product: {
        keyFields: ["id"],
      },
      // Normalize InventoryItem by productId + size + color compound key.
      InventoryItem: {
        keyFields: ["productId", "size", "color"],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});

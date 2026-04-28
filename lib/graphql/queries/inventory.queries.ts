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
      // Normalize InventoryItem by id.
      // Previously used a compound key ["productId", "size", "color"] which
      // caused Apollo to throw when ANY query writing InventoryItem objects to
      // the cache omitted one of the key fields — e.g. GET_LOW_STOCK only
      // selects productId/size/color and no other fields, leaving partial
      // entries that Apollo cannot denormalize on subsequent reads.
      // Using "id" (the MongoDB ObjectId) is the correct stable unique key,
      // consistent with Order, Customer, and Product above, and is safe
      // because every query and mutation that touches InventoryItem already
      // returns id in its selection set.
      InventoryItem: {
        keyFields: ["id"],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
    },
  },
});

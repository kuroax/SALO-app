import { gql } from "@apollo/client";

export const LIST_PRODUCTS = gql`
  query ListProducts($filters: ListProductsInput) {
    products(filters: $filters) {
      products {
        id
        name
        brand
        status
        variants {
          size
          color
        }
      }
      total
    }
  }
`;

import { gql } from "@apollo/client";

export const LIST_PRODUCTS = gql`
  query ListProducts($filters: ListProductsInput) {
    products(filters: $filters) {
      products {
        id
        name
        brand
        status
        images
        variants {
          size
          color
        }
      }
      total
    }
  }
`;

import { gql } from "@apollo/client";

export const GET_PRODUCT_INVENTORY = gql`
  query GetProductInventory($productId: ID!) {
    productInventory(productId: $productId) {
      id
      productId
      size
      color
      quantity
      lowStockThreshold
      isLowStock
    }
  }
`;

export const GET_LOW_STOCK = gql`
  query GetLowStock {
    lowStock {
      productId
    }
  }
`;

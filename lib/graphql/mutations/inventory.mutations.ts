import { gql } from "@apollo/client";

export const ADD_STOCK = gql`
  mutation AddStock($input: AddStockInput!) {
    addStock(input: $input) {
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

export const REMOVE_STOCK = gql`
  mutation RemoveStock($input: RemoveStockInput!) {
    removeStock(input: $input) {
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

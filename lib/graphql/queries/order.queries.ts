import { gql } from "@apollo/client";

// ─── Orders List ──────────────────────────────────────────────────────────────

export const LIST_ORDERS = gql`
  query ListOrders($filter: OrderFilterInput) {
    orders(filter: $filter) {
      id
      orderNumber
      status
      paymentStatus
      total
      createdAt
      customerId
      items {
        quantity
      }
    }
  }
`;

// ─── Order Detail ─────────────────────────────────────────────────────────────

export const GET_ORDER = gql`
  query GetOrder($orderId: ID!) {
    order(orderId: $orderId) {
      id
      orderNumber
      status
      paymentStatus
      subtotal
      total
      channel
      inventoryApplied
      createdAt
      updatedAt
      customerId
      items {
        productId
        productName
        productSlug
        size
        color
        quantity
        unitPrice
        lineTotal
      }
      notes {
        message
        kind
        createdAt
      }
    }
  }
`;

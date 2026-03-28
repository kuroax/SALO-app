import { gql } from "@apollo/client";

// ─── Create Order ─────────────────────────────────────────────────────────────

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      orderNumber
      status
      paymentStatus
      total
      createdAt
    }
  }
`;

// ─── Update Order Status ──────────────────────────────────────────────────────

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($input: UpdateOrderStatusInput!) {
    updateOrderStatus(input: $input) {
      id
      status
      notes {
        message
        kind
        createdAt
      }
    }
  }
`;

// ─── Cancel Order ─────────────────────────────────────────────────────────────

export const CANCEL_ORDER = gql`
  mutation CancelOrder($input: CancelOrderInput!) {
    cancelOrder(input: $input) {
      id
      status
      notes {
        message
        kind
        createdAt
      }
    }
  }
`;

// ─── Update Payment Status ────────────────────────────────────────────────────

export const UPDATE_PAYMENT_STATUS = gql`
  mutation UpdatePaymentStatus($input: UpdatePaymentStatusInput!) {
    updatePaymentStatus(input: $input) {
      id
      paymentStatus
      notes {
        message
        kind
        createdAt
      }
    }
  }
`;

// ─── Add Order Note ───────────────────────────────────────────────────────────

export const ADD_ORDER_NOTE = gql`
  mutation AddOrderNote($input: AddOrderNoteInput!) {
    addOrderNote(input: $input) {
      id
      notes {
        message
        kind
        createdAt
      }
    }
  }
`;

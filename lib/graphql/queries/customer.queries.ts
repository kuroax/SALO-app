import { gql } from "@apollo/client";

export const LIST_CUSTOMERS = gql`
  query ListCustomers($input: ListCustomersInput) {
    customers(input: $input) {
      customers {
        id
        name
        phone
        instagramHandle
        contactChannel
        tags
        isActive
      }
      total
    }
  }
`;

export const GET_CUSTOMER = gql`
  query GetCustomer($id: ID!) {
    customer(id: $id) {
      id
      name
      phone
      instagramHandle
      contactChannel
      notes
      tags
      address
      isActive
      createdAt
      updatedAt
    }
  }
`;

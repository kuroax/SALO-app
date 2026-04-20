import { gql } from "@apollo/client";

export const CREATE_CUSTOMER = gql`
  mutation CreateCustomer($input: CreateCustomerInput!) {
    createCustomer(input: $input) {
      id
      name
      phone
      instagramHandle
      contactChannel
      tags
      gender
      isActive
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($id: ID!, $input: UpdateCustomerInput!) {
    updateCustomer(id: $id, input: $input) {
      id
      name
      phone
      instagramHandle
      contactChannel
      notes
      tags
      address
      gender
      isActive
      createdAt
      updatedAt
    }
  }
`;

export const DEACTIVATE_CUSTOMER = gql`
  mutation DeactivateCustomer($id: ID!) {
    deactivateCustomer(id: $id) {
      id
      isActive
    }
  }
`;

export const ACTIVATE_CUSTOMER = gql`
  mutation ActivateCustomer($id: ID!) {
    activateCustomer(id: $id) {
      id
      isActive
    }
  }
`;

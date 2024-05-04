
import { JwtPayload } from 'jsonwebtoken';

// Minimal interface for API response that contains only the necessary role description
export interface UserRole {
  status: {
    code: string;
  };
  type: {
    description: string;
  };
}

export type UserRolesResponse = UserRole[];

// Minimal interface for API response that contains only the necessary userRoleId
export interface OrganizationResponse {
  userOrganizationId: number;
  email: string;
}

// Minimal interface for API response that contains only the necessary userRoleId
interface RoleData {
  role: {
    userRoleId: number;
  };
}

// Define the structure of the response as containing an array of RoleData
export type RetrieveUsersResponse = RoleData[];

// Minimal interface for Token Response
export interface ApiTokenResponse {
  access_token: string;
  token_type: string;
  not_before: string;
  expires_in: string;
  expires_on: string;
  resource: string;
}

export interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;

  id_token: string;
  id_token_expires_in: string;
  profile_info: string;
  scope: string;
  refresh_token: string;
  refresh_token_expires_in: string;
}

export interface OidcJwtPayload extends JwtPayload {
  userId?: string;
  userRoleId?: string;
  email?: string;
  acr?: string;
  given_name?: string;
  family_name?: string;
  aud?: string;
  iss?: string;
}

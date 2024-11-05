export interface MockPermissions {
  facId: number;
  orisCode: number;
  roles: string[];
}

export interface MockPermissionObject {
  userId: string;
  isAdmin?: boolean;
  facilities: MockPermissions[];
  missingCertificationStatements: boolean;
}

export interface MockPermissions {
  facilities: number[];
  roles: string[];
}

export interface MockPermissionObject {
  userId: string;
  isAdmin?: boolean;
  facilities: Facility[];
}

interface Facility {
  id: number;
  permissions: string[];
}
import { PermissionsDTO } from './permissions.dto';

export class UserDTO {
  userId: string;
  firstName: string;
  lastName: string;
  token: string;
  tokenExpiration: string;
  email: string;
  permissions: PermissionsDTO;
}

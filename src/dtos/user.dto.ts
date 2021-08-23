export class UserDTO {
  userId: string;
  firstName: string;
  lastName: string;
  token: string;
  tokenExpiration: string;
  roles: string[];
  facilities: number[];
}

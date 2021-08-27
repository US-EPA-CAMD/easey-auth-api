export class UserDTO {
  userId: string;
  token: string;
  firstName: string;
  lastName: string;
  tokenExpiration: string;
  email: string;
  roles: string[];
  facilities: number[];
}

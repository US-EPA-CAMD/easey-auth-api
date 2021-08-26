export class UserDTO {
  userId: string;
  token: string;
  tokenExpiration: string;
  email: string;
  roles: string[];
  facilities: number[];
}

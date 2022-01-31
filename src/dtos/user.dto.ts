import { FacilitiesDTO } from './facilities.dto';

export class UserDTO {
  userId: string;
  firstName: string;
  lastName: string;
  token: string;
  tokenExpiration: string;
  email: string;
  facilities: FacilitiesDTO[];
}

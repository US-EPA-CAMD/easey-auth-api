import { ApiHideProperty } from "@nestjs/swagger";

export class UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
}
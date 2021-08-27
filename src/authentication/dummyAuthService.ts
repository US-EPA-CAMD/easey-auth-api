import { ConfigService } from '@nestjs/config';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createClientAsync } from 'soap';

import { UserDTO } from './../dtos/user.dto';

@Injectable()
export class DummyAuthService {
  constructor(private configService: ConfigService) {}

  async authenticate(userId: string, password: string): Promise<UserDTO> {
    let dto = null;
    const env = this.configService.get<string>('app.env');

    if (env !== 'production') {
      switch (userId) {
        case 'emmy':
          dto = new UserDTO();
          dto.id = userId;
          dto.firstName = 'Emmy';
          dto.lastName = 'Winter';
          dto.status = 'Valid';
          break;
        case 'brian':
          dto = new UserDTO();
          dto.id = userId;
          dto.firstName = 'Brian';
          dto.lastName = 'Nobel';
          dto.status = 'Valid';
          break;
        default:
          dto = this.login(userId, password);
          break;
      }

      return dto;
    }

    return this.login(userId, password);
  }

  private async login(userId: string, password: string): Promise<UserDTO> {
    let dto = null;
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterAuthService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId,
          password,
        });
      })
      .then(res => {
        const user = res[0].User;

        dto = new UserDTO();
        dto.id = user.userId;
        dto.firstName = user.firstName;
        dto.lastName = user.lastName;
        dto.status = user.status;

        return dto;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.RegisterAuthFault.description,
        );
      });
  }
}

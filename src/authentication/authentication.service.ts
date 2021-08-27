import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';

import { UserDTO } from './../dtos/user.dto';
import { TokenService } from '../token/token.service';
import { parseToken } from '../utils';

@Injectable()
export class AuthenticationService {
  constructor(
    private configService: ConfigService,
    private tokenService: TokenService,
  ) {}

  async authenticateDummy(userId: string, password: string): Promise<UserDTO> {
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
          dto = this.loginDummy(userId, password);
          break;
      }

      return dto;
    }

    return this.loginDummy(userId, password);
  }

  private async loginDummy(userId: string, password: string): Promise<UserDTO> {
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

  async signIn(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    let user: UserDTO;

    const sessionStatus = await this.tokenService.getSessionStatus(userId);
    if (sessionStatus.exists) {
      if (sessionStatus.expired) {
        throw new BadRequestException('Token has expired');
      }

      const sessionDTO = sessionStatus.session;

      user = new UserDTO();
      user.token = sessionDTO.securityToken;
      user.tokenExpiration = sessionDTO.tokenExpiration;
      user.userId = userId;

      return user;
    }

    user = await this.login(userId, password);
    const session = await this.tokenService.createUserSession(userId);
    user.token = await this.tokenService.createToken(userId, clientIp);
    user.tokenExpiration = session.tokenExpiration;

    return user;
  }

  async login(userId: string, password: string): Promise<UserDTO> {
    let dto: UserDTO;
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
        dto.userId = user.userId;
        return dto;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.RegisterAuthFault.description,
        );
      });
  }

  async signOut(token: string, clientIp: string) {
    const stringifiedToken = await this.tokenService.unpackToken(
      token,
      clientIp,
    );
    const parsed = parseToken(stringifiedToken);

    if (parsed.clientIp !== clientIp) {
      throw new BadRequestException('Request from invalid IP.');
    }

    const sessionStatus = await this.tokenService.getSessionStatus(
      parsed.userId,
    );
    if (sessionStatus.exists) {
      await this.tokenService.removeUserSession(sessionStatus.sessionEntity);
    } else throw new BadRequestException('No session exists for token.');
  }
}

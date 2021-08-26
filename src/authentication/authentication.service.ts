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

  async authenticate(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    let user: UserDTO;

    const sessionStatus = await this.tokenService.getSessionStatus(userId);
    if (sessionStatus.active) {
      if (!sessionStatus.allowed) {
        throw new BadRequestException('Token has expired');
      }

      const sessionDTO = sessionStatus.session;

      const token = await this.tokenService.validateToken(
        sessionDTO.securityToken,
        clientIp,
      );

      const parsed = parseToken(token);

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

  private async login(userId: string, password: string): Promise<UserDTO> {
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

    const sessionStatus = await this.tokenService.getSessionStatus(
      parsed.userId,
    );
    if (sessionStatus.active) {
      await this.tokenService.removeUserSession(sessionStatus.sessionEntity);
    } else throw new BadRequestException('No session exists for token.');
  }
}

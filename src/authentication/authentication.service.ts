import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';

import { UserDTO } from './../dtos/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSessionMap } from '../maps/user-session.map';
import { UserSession } from '../entities/user-session.entity';
import { UserSessionDTO } from 'src/dtos/user-session.dto';

interface Token {
  userId: string;
  sessionId: string;
  firstName: string;
  lastName: string;
  expiration: string;
}

interface SessionStatus {
  active: boolean;
  allowed: boolean;
  session: UserSessionDTO;
  sessionEntity: UserSession;
}

@Injectable()
export class AuthenticationService {
  private readonly appId = 'easey.camd.oar.dev@epa.gov';
  private readonly appPwd = 'DEVeasey01!';

  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,
    private configService: ConfigService,
    private map: UserSessionMap,
  ) {}

  parseToken(token: string): Token {
    let obj = {
      userId: null,
      sessionId: null,
      firstName: null,
      lastName: null,
      expiration: null,
    };

    const arr = token.split('&');
    arr.forEach(element => {
      const keyValue = element.split('=');
      obj[keyValue[0]] = keyValue[1];
    });

    return obj;
  }

  async getSessionStatus(userid: string): Promise<SessionStatus> {
    let status: SessionStatus = {
      active: false,
      allowed: false,
      session: null,
      sessionEntity: null,
    };

    const userSession = await this.repository.findOne(userid);
    if (userSession !== undefined) {
      status.active = true;
      status.sessionEntity = userSession;
      const sessionDTO = await this.map.one(userSession);
      status.session = sessionDTO;
      if (new Date(Date.now()) < new Date(sessionDTO.tokenExpiration)) {
        status.allowed = true;
      }
    }

    return status;
  }

  async authenticate(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    let user: UserDTO;
    const sessionStatus = await this.getSessionStatus(userId);
    if (sessionStatus.active) {
      if (!sessionStatus.allowed) {
        throw new BadRequestException('Token has expired');
      }

      const sessionDTO = sessionStatus.session;

      const token = await this.validateToken(
        sessionDTO.securityToken,
        clientIp,
      );

      const parsed = this.parseToken(token);

      user = new UserDTO();

      user.firstName = parsed.firstName;
      user.lastName = parsed.lastName;
      user.token = sessionDTO.securityToken;
      user.tokenExpiration = sessionDTO.tokenExpiration;
      user.userId = userId;

      return user;
    }

    user = await this.login(userId, password);
    const sessionId = uuidv4();

    const expiration = new Date(Date.now() + 20 * 60000).toUTCString(); //Expire in 20 minutes
    const current = new Date(Date.now()).toUTCString();

    const session = new UserSession();
    session.userId = userId;
    session.sessionId = sessionId;
    session.tokenExpiration = expiration;
    session.lastLoginDate = current;
    await this.repository.save(session);

    user.token = await this.createToken(
      userId,
      clientIp,
      user.firstName,
      user.lastName,
    );
    user.tokenExpiration = expiration;
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
        dto.firstName = user.firstName;
        dto.lastName = user.lastName;
        return dto;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.RegisterAuthFault.description,
        );
      });
  }

  async createToken(
    userId: string,
    clientIp: string,
    firstName: string,
    lastName: string,
  ): Promise<any> {
    const url = this.configService.get<string>('app.naasSvcs');

    const tokenExpiration = new Date(Date.now() + 20 * 60000).toUTCString();
    const userSession = await this.getSessionStatus(userId);
    if (!userSession.active || !userSession.allowed) {
      throw new BadRequestException('No valid user session!');
    }

    const sessionDTO = userSession.session;
    sessionDTO.tokenExpiration = tokenExpiration;

    return createClientAsync(url)
      .then(client => {
        return client.CreateSecurityTokenAsync({
          trustee: this.appId,
          credential: this.appPwd,
          domain: 'default',
          tokenType: 'csm',
          issuer: this.appId,
          authMethod: 'password',
          subject: userId,
          subjectData: `userId=${userId}&sessionId=${sessionDTO.sessionId}&firstName=${firstName}&lastName=${lastName}&expiration=${tokenExpiration}`,
          ip: clientIp,
        });
      })
      .then(res => {
        sessionDTO.securityToken = res[0].return;
        this.repository.update(userId, sessionDTO);

        return res[0].return;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          'Create security token failed!',
        );
      });
  }

  async unpackToken(token: string, clientIp: string): Promise<any> {
    const url = this.configService.get<string>('app.naasSvcs');

    return createClientAsync(url)
      .then(client => {
        return client.ValidateAsync({
          userId: this.appId,
          credential: this.appPwd,
          domain: 'default',
          securityToken: token,
          clientIp: clientIp,
          resourceURI: null,
        });
      })
      .then(async res => {
        return res[0].return;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          'Security token validation failed!',
        );
      });
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    const stringifiedToken = await this.unpackToken(token, clientIp);
    const parsed = this.parseToken(stringifiedToken);

    const sessionStatus = await this.getSessionStatus(parsed.userId);
    if (!sessionStatus.active || !sessionStatus.allowed)
      throw new BadRequestException(
        'No valid session exists for the user. Please log in to create a valid session."',
      );

    return stringifiedToken;
  }

  async signOut(token: string, clientIp: string) {
    const stringifiedToken = await this.unpackToken(token, clientIp);
    const parsed = this.parseToken(stringifiedToken);

    const sessionStatus = await this.getSessionStatus(parsed.userId);
    if (sessionStatus.active) {
      await this.repository.remove(sessionStatus.sessionEntity);
    } else throw new BadRequestException('No session exists for token.');
  }
}

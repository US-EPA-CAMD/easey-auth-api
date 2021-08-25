import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
}

interface SessionStatus {
  active: boolean;
  allowed: boolean;
  session: UserSessionDTO;
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
    };

    const arr = token.split('&');
    arr.forEach(element => {
      let keyValue = element.split('=');
      obj[keyValue[0]] = keyValue[1];
    });

    return obj;
  }

  /*
  async getSessionStatus(userid: string): Promise<SessionStatus> {
    let status: SessionStatus = {
      active: false,
      allowed: false,
      session: null,
    };

    const userSession = await this.repository.findOne(userid);
    if (userSession !== undefined) {
      status.active = true;

      const sessionDTO = await this.map.one(userSession);
      status.session = sessionDTO;
      if (new Date(Date.now()) < new Date(sessionDTO.tokenExpiration)) {
        status.allowed = true;
      }
    }

    return status;
  }
  */

  async authenticate(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    // TODO: Validation check on session in DB [If session exists throw an error]

    let user: UserDTO;

    /*
    const sessionStatus = await this.getSessionStatus(userId);
    if (sessionStatus.active) {
      if (!sessionStatus.allowed) {
        throw new InternalServerErrorException('Token has expired');
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
    */

    user = await this.login(userId, password);
    const expiration = new Date(Date.now() + 20 * 60000).toUTCString(); //Expire in 20 minutes

    /*
    const sessionId = uuidv4();

    const current = new Date(Date.now()).toUTCString();

    const session = new UserSession();
    session.userId = userId;
    session.sessionId = sessionId;
    session.tokenExpiration = expiration;
    session.lastLoginDate = current;
    await this.repository.save(session);

    */
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

    /*
    const userSession = await this.getSessionStatus(userId);
    if (!userSession.active) {
      throw new InternalServerErrorException('No valid user session!');
    }
    const sessionDTO = userSession.session;
    */

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
          subjectData: `userId=${userId}&firstName=${firstName}&lastName=${lastName}`,
          ip: clientIp,
        });
      })
      .then(res => {
        /*
        sessionDTO.securityToken = res[0].return;
        this.repository.update(userId, sessionDTO);
        */

        return res[0].return;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          'Create security token failed!',
        );
      });
  }

  async validateToken(token: string, clientIp: string): Promise<any> {
    const url = this.configService.get<string>('app.naasSvcs');

    const parsed = this.parseToken(token);
    const userid = parsed.userId;
    /*
    const sessionStatus = await this.getSessionStatus(userid);
    if (!sessionStatus.active || !sessionStatus.allowed)
      throw new InternalServerErrorException('Session has expired');
    */

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
      .then(res => {
        return res[0].return;
      })
      .catch(err => {
        throw new InternalServerErrorException(
          err.root.Envelope.Body.Fault.detail.faultdetails,
          'Security token validation failed!',
        );
      });
  }
}

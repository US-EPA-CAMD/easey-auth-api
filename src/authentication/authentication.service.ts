import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { createClientAsync } from 'soap';

import { UserDTO } from './../dtos/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { UserSessionMap } from '../maps/user-session.map';

@Injectable()
export class AuthenticationService {
  private readonly appId = 'easey.camd.oar.dev@epa.gov';
  private readonly appPwd = 'DEVeasey01!';

  constructor(
    @InjectRepository(UserSessionRepository)
    private repository: UserSessionRepository,
    private configService: ConfigService,
    private sessionMap: UserSessionMap,
  ) {}

  async authenticate(
    userId: string,
    password: string,
    clientIp: string,
  ): Promise<UserDTO> {
    // TODO: Validation check on session in DB [If session exists throw an error]

    const userSession = await this.repository.findOne(userId);
    console.log(userSession);

    const user = await this.login(userId, password);

    const sessionId = uuidv4();

    // TODO: Add session id to database (await)

    user.token = await this.createToken(userId, clientIp);
    user.tokenExpiration = new Date(Date.now()).toUTCString();
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

  async createToken(userId: string, clientIp: string): Promise<any> {
    const url = this.configService.get<string>('app.naasSvcs');

    //TODO: check database to obtain session ID [If none exists throw error]

    const userSession = await this.repository.findOne(userId);
    console.log(userSession);

    const sessionId = '';

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
          subjectData: `userId=${userId}&sessionId=${sessionId}`,
          ip: clientIp,
        });
      })
      .then(res => {
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

    //TODO: parse token and make sure user has valid session

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

import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { createClientAsync } from 'soap';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenService } from '../token/token.service';
import { OidcHelperService } from '../oidc/OidcHelperService';
import { CredentialsSignDTO, SignatureRequest } from '../dtos/certification-sign-param.dto';
import { BypassService } from '../oidc/Bypass.service';
import { PolicyResponse } from '../dtos/policy-response';

@Injectable()
export class SignService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly userSessionService: UserSessionService,
    private readonly tokenService: TokenService,
    private readonly bypassService: BypassService,
    private readonly oidcHelperService: OidcHelperService,
  ) {}

  async getSignServiceToken(): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
        });
      })
      .then(res => {
        return res[0].securityToken;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  async sendPhoneVerification(
    token: string,
    activityId: string,
    userId: string,
    phone: string,
  ): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.GenerateAndSendSecretCodeAsync({
          securityToken: token,
          activityId: activityId,
          userId: userId,
          mobilePhone: phone,
          secretCodeType: 'SMS',
        });
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  async signAllFiles(
    activityId: string,
    fileArray: Express.Multer.File[]
  ): Promise<void> {

    const apiToken = await this.tokenService.getCdxApiToken();
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = `${registerApiUrl}/api/v1/cromerr/sign`;

    try {
      const signatureRequest = new SignatureRequest();
      signatureRequest.activityId = activityId;
      const signAuthResponseDTO =
        await this.oidcHelperService.makePostRequestForFile<SignAuthResponseDTO>(apiUrl, apiToken, fileArray, signatureRequest);

      if (!signAuthResponseDTO) {
        throw new Error(`Unable to sign document with activity id ${activityId}`);
      }

    } catch (error) {
      this.logger.error(`Unable to sign document with activity id ${activityId}`, error);
      throw new EaseyException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createCromerrActivity(
    user: CurrentUser,
    credentials: CredentialsSignDTO, idToken?: string
  ): Promise<SignAuthResponseDTO> {

    //If bypass is enabled AND a valid idToken is not given, then we cannot make
    // a call to create an activity as the CROMERR POST call requires a valid idToken
    if (!idToken && this.bypassService.bypassEnabled()) {
      const signAuthResponseDTO = new SignAuthResponseDTO();
      signAuthResponseDTO.activityId = '1';
      return signAuthResponseDTO;
    }

    //If an idToken is not passed in, see if the user has a valid session
    if (!idToken) {
      const userSession = await this.userSessionService.findSessionByUserId(user.userId);
      if (!userSession) {
        throw new EaseyException(new Error('Unable to create activity. There is no ID token provided or the user does not have a valid session.'), HttpStatus.BAD_REQUEST);
      }
      idToken = userSession.idToken;
    }

    if (!(user.roles.includes('Submitter') || user.roles.includes('Sponsor') || user.roles.includes('Initial Authorizer')) ) {
      throw new EaseyException(
        new Error('This requires the Sponsor, Submitter, or Initial Authorizer role'),
        HttpStatus.BAD_REQUEST,
        {
          responseObject: 'This requires the Sponsor, Submitter, or Initial Authorizer role',
        },
      );
    }

    //create the activity
    const apiToken = await this.tokenService.getCdxApiToken();
    return await this.sendToCromerr(apiToken, credentials, idToken);
  }

  async sendToCromerr(apiToken: string, credentials: CredentialsSignDTO, idToken: string): Promise<SignAuthResponseDTO> {
    const dataflowName = getConfigValue('ECMPS_DATA_FLOW_NAME', '');
    const requestBody = {
      user: {
        userId: credentials.userId,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        middleInitial: credentials.middleInitial,
      },
      dataflow: dataflowName,
      activityDescription: credentials.activityDescription,
    };

    const customHeaders = {
      'Id-Token': idToken,
    };
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = `${registerApiUrl}/api/v1/cromerr/createActivity`;

    try {
      const signAuthResponseDTO = await this.oidcHelperService.makePostRequestJson<SignAuthResponseDTO>(apiUrl, requestBody, apiToken, customHeaders);
      if (!signAuthResponseDTO) {
        throw new Error(`Unable to create a CROMERR activity for user ${credentials.userId}`);
      }

      return signAuthResponseDTO;

    } catch (error) {
      this.logger.error(`Unable to create a CROMERR activity for user ${credentials.userId}`, error);
      throw new Error(`Unable to create a CROMERR activity for user ${credentials.userId}.  ${error.message}`);
    }
  }

  async sendPhoneVerificationCode(
    payload: SendPhonePinParamDTO,
  ): Promise<void> {
    const token = await this.getSignServiceToken();

    await this.sendPhoneVerification(
      token,
      payload.activityId,
      payload.userId,
      payload.number,
    );
  }

}

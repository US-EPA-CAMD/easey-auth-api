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
import {
  CredentialsSignDTO,
  SignatureRequest,
} from '../dtos/certification-sign-param.dto';
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

  async signAllFiles(
    activityId: string,
    fileArray: Express.Multer.File[],
  ): Promise<void> {
    //If bypass is enabled, skip the call to sign
    if (this.bypassService.bypassEnabled()) {
      return;
    }

    const signFilesIndividually = this.configService.get<boolean>('app.signFilesIndividually');
    const apiToken = await this.tokenService.getCdxApiToken();
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = signFilesIndividually
      ? `${registerApiUrl}/api/v1/cromerr/sign`
      : `${registerApiUrl}/api/v1/cromerr/signMultiple`;

    try {
      const signatureRequest = new SignatureRequest();
      signatureRequest.activityId = activityId;

      let signAuthResponseDTO : SignAuthResponseDTO;
      if (signFilesIndividually) {

        for (const file of fileArray) {
          // Add your processing logic here
          signAuthResponseDTO = await this.oidcHelperService.signSingleFile<
            SignAuthResponseDTO
          >(apiUrl, apiToken, file, signatureRequest);
        }

      } else {
        signAuthResponseDTO = await this.oidcHelperService.signMultipleFiles<
          SignAuthResponseDTO
        >(apiUrl, apiToken, fileArray, signatureRequest);
      }

      if (!signAuthResponseDTO) {
        throw new Error(`Unable to sign document with activity id ${activityId}`,);
      }
    } catch (error) {
      this.logger.error(
        `Unable to sign document with activity id ${activityId}`,
        error,
      );
      throw new EaseyException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async createCromerrActivity(
    user: CurrentUser,
    credentials: CredentialsSignDTO,
    idToken?: string,
  ): Promise<SignAuthResponseDTO> {
    //If bypass is enabled, return as a dummy activity as we do not have a valid ID token
    if (this.bypassService.bypassEnabled()) {
      const signAuthResponseDTO = new SignAuthResponseDTO();
      signAuthResponseDTO.activityId = '1';
      return signAuthResponseDTO;
    }

    //If an idToken is not passed in, assume ECMPS and try to get the token from the session
    if (!idToken) {
      const userId = user?.userId ?? '';
      const userSession = await this.userSessionService.findSessionByUserId(
        userId,
      );
      if (!userSession) {
        throw new EaseyException(
          new Error(
            'Unable to create activity. No valid id-token found for the user.',
          ),
          HttpStatus.BAD_REQUEST,
        );
      }
      idToken = userSession.idToken;
    }

    //create the activity
    const apiToken = await this.tokenService.getCdxApiToken();
    return await this.sendToCromerr(apiToken, credentials, idToken);
  }

  async sendToCromerr(
    apiToken: string,
    credentials: CredentialsSignDTO,
    idToken: string,
  ): Promise<SignAuthResponseDTO> {
    const dataflowName = this.configService.get<string>('app.dataFlow' ) ;
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
      const signAuthResponseDTO = await this.oidcHelperService.makePostRequestJson<
        SignAuthResponseDTO
      >(apiUrl, requestBody, apiToken, customHeaders);
      if (!signAuthResponseDTO) {
        throw new Error(
          `Unable to create a CROMERR activity for user ${credentials.userId}`,
        );
      }

      return signAuthResponseDTO;
    } catch (error) {
      this.logger.error(
        `Unable to create a CROMERR activity for user ${credentials.userId}`,
        error,
      );
      throw new Error(
        `Unable to create a CROMERR activity for user ${credentials.userId}.  ${error.message}`,
      );
    }
  }
}

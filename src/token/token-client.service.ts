import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign, verify } from 'jsonwebtoken';

import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { ApiRepository } from './api.repository';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { TokenDTO } from 'src/dtos/token.dto';

@Injectable()
export class TokenClientService {
  constructor(
    @InjectRepository(ApiRepository)
    private readonly apiRepository: ApiRepository,

    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async validateClientToken(
    validateClientTokenParams: ValidateClientTokenParamsDTO,
  ): Promise<boolean> {
    //Ensure fields have been set
    if (
      !validateClientTokenParams.clientId ||
      !validateClientTokenParams.clientToken
    ) {
      this.logger.error(
        BadRequestException,
        'Must provide an app name and client token',
        true,
      );
    }

    try {
      const dbRecord = await this.apiRepository.findOne({
        clientId: validateClientTokenParams.clientId,
      });

      //Determine if a match exists
      if (!dbRecord) {
        this.logger.error(BadRequestException, 'Invalid ClientId', true);
      }

      //Attempt to verify the incoming token
      const decoded = verify(
        validateClientTokenParams.clientToken,
        dbRecord.encryptionKey,
      );

      if (decoded.passCode !== dbRecord.passCode) {
        this.logger.error(BadRequestException, 'Invalid Token', true);
      }

      return true;
    } catch (err) {
      this.logger.error(BadRequestException, err.message, true);
    }

    return null;
  }

  async generateClientToken(
    validateClientIdParams: ValidateClientIdParamsDTO,
  ): Promise<TokenDTO> {
    //Ensure fields have been set
    if (
      !validateClientIdParams.clientId ||
      !validateClientIdParams.clientSecret
    ) {
      this.logger.error(
        BadRequestException,
        'Must provide a clientId and clientSecret',
        true,
      );
    }

    // Lookup record by clientId, clientSecret
    const apiRecord = await this.apiRepository.findOne({
      clientId: validateClientIdParams.clientId,
      clientSecret: validateClientIdParams.clientSecret,
    });

    // If the record exists, encrypt the passcode associated with that app
    if (apiRecord) {
      const expiration =
        this.configService.get<number>('app.clientTokenDurationMinutes') * 60;

      const tokenDTO = new TokenDTO();
      tokenDTO.token = sign(
        {
          passCode: apiRecord.passCode,
        },
        apiRecord.encryptionKey,
        {
          expiresIn: expiration,
        },
      );
      tokenDTO.expiration = new Date(
        Date.now() + 1000 * expiration,
      ).toUTCString();

      return tokenDTO;
    } else {
      this.logger.error(
        BadRequestException,
        'Invalid clientId or clientSecret',
        true,
      );
    }

    return null;
  }
}

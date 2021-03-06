import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign, verify } from 'jsonwebtoken';

import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { ApiRepository } from './api.repository';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';
import { TokenDTO } from '../dtos/token.dto';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

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
      throw new LoggingException(
        'Must provide a clientId and clientToken',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const dbRecord = await this.apiRepository.findOne(
        validateClientTokenParams.clientId,
      );

      //Determine if a match exists
      if (!dbRecord) {
        throw new LoggingException('Invalid clientId', HttpStatus.BAD_REQUEST);
      }

      //Attempt to verify the incoming token
      const decoded = verify(
        validateClientTokenParams.clientToken,
        dbRecord.encryptionKey,
      );

      if (decoded.passCode !== dbRecord.passCode) {
        throw new LoggingException(
          'Invalid clientToken',
          HttpStatus.BAD_REQUEST,
        );
      }

      return true;
    } catch (err) {
      throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
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
      throw new LoggingException(
        'Must provide a clientId and clientToken',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Lookup record by clientId, clientSecret
    const apiRecord = await this.apiRepository.findOne({
      id: validateClientIdParams.clientId,
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
      throw new LoggingException(
        'Invalid clientId or clientSecret',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

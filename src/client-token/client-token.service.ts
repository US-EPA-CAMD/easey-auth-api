import { sign, verify } from 'jsonwebtoken';
import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

import { TokenDTO } from '../dtos/token.dto';
import { ClientTokenRepository } from './client-token.repository';
import { ValidateClientIdParamsDTO } from '../dtos/validate-client-id.dto';
import { ValidateClientTokenParamsDTO } from '../dtos/validate-client-token.dto';

@Injectable()
export class ClientTokenService {
  constructor(
    @InjectRepository(ClientTokenRepository)
    private readonly repository: ClientTokenRepository,
    private readonly configService: ConfigService,
  ) {}

  async validateToken(
    params: ValidateClientTokenParamsDTO,
  ): Promise<boolean> {
    //Ensure fields have been set
    if (!params.clientId || !params.clientToken) {
      throw new LoggingException(
        'A client id and token must be provided to access this resource.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const dbRecord = await this.repository.findOne(params.clientId);

      //Determine if a match exists
      if (!dbRecord) {
        throw new LoggingException(
          'The client id provided in the request is not a valid registered client application.',
          HttpStatus.BAD_REQUEST
        );
      }

      //Attempt to verify the incoming token
      const decoded = verify(
        params.clientToken,
        dbRecord.encryptionKey,
      );

      if (decoded.passCode !== dbRecord.passCode) {
        throw new LoggingException(
          'The client token provided in the request is invalid and cannot be verified.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return true;
    } catch (err) {
      throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  async generateToken(
    params: ValidateClientIdParamsDTO,
  ): Promise<TokenDTO> {
    //Ensure fields have been set
    if (!params.clientId || !params.clientSecret) {
      throw new LoggingException(
        'A client id and secret must be provided to access this resource.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Lookup record by clientId, clientSecret
      const dbRecord = await this.repository.findOne({
        id: params.clientId,
        secret: params.clientSecret,
      });

      // If the record exists, encrypt the passcode associated with that app
      if (dbRecord) {
        const expiration =
          this.configService.get<number>('app.clientTokenDurationMinutes') * 60;

        const tokenDTO = new TokenDTO();
        tokenDTO.token = sign(
          {
            passCode: dbRecord.passCode,
          },
          dbRecord.encryptionKey,
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
          'The client id provided in the request is not a valid registered client application.',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (err) {
      throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}

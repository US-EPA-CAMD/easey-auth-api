import { JwtPayload, sign, verify } from 'jsonwebtoken';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { dateToEstString } from '@us-epa-camd/easey-common/utilities/functions';

import { TokenDTO } from '../dtos/token.dto';
import { ClientTokenRepository } from './client-token.repository';
import { Logger } from '@us-epa-camd/easey-common/logger';

@Injectable()
export class ClientTokenService {
  constructor(
    private readonly repository: ClientTokenRepository,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async validateToken(clientId: string, clientToken: string): Promise<boolean> {
    //Ensure fields have been set
    this.logger.debug('validateToken for ', { clientId });
    if (!clientId || !clientToken) {
      throw new EaseyException(
        new Error(
          'A client id and token must be provided to access this resource.',
        ),
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const dbRecord = await this.repository.findOneBy({ id: clientId });

      //Determine if a match exists
      if (!dbRecord) {
        throw new EaseyException(
          new Error(
            'The client id provided in the request is not a valid registered client application: ' + clientId,
          ),
          HttpStatus.BAD_REQUEST,
        );
      }

      //Attempt to verify the incoming token
      const decoded = verify(clientToken, dbRecord.encryptionKey) as JwtPayload;

      if (decoded.passCode !== dbRecord.passCode) {
        throw new EaseyException(
          new Error(
            'The client token provided in the request is invalid and cannot be verified: ' + clientId,
          ),
          HttpStatus.BAD_REQUEST,
        );
      }

      return true;
    } catch (err) {
      throw new EaseyException(err, HttpStatus.BAD_REQUEST);
    }
  }

  async generateToken(
    clientId: string,
    clientSecret: string,
  ): Promise<TokenDTO> {
    const firstTenCharsOfClientSecret = clientSecret ? clientSecret.slice(0, 10) : '';
    this.logger.debug('generateToken for ', { clientId, firstTenCharsOfClientSecret});
    //Ensure fields have been set
    if (!clientId || !clientSecret) {
      throw new EaseyException(
        new Error(
          'A client id and secret must be provided to access this resource.',
        ),
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Lookup record by clientId, clientSecret
      const dbRecord = await this.repository.findOneBy({
        id: clientId,
        secret: clientSecret,
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

        tokenDTO.expiration = dateToEstString(Date.now() + 1000 * expiration);

        return tokenDTO;
      } else {
        throw new EaseyException(
          new Error(
            'The client id provided in the request is not a valid registered client application: ' + clientId,
          ),
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (err) {
      throw new EaseyException(err, HttpStatus.BAD_REQUEST);
    }
  }
}

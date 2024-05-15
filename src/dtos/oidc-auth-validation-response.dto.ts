import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { UserDTO } from './user.dto';
import { UserSession } from '../entities/user-session.entity';

export class OidcAuthValidationResponseDto {

  isValid?: boolean;
  code?: string;
  message?: string;
  userId?: string;
  policy?: string;
  userSession?: UserSession;
  userDTO?: UserDTO;

  constructor(init?: Partial<OidcAuthValidationResponseDto>) {
    Object.assign(this, init);
  }
}


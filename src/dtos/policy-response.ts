import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { Logger } from '@us-epa-camd/easey-common/logger';

export class PolicyResponse {
  policy?: string;
  userId?: string;
  userRoleId?: number;
  nonce?: string;
  state?: string;
  redirectUri?: string;

  //In case of errors, the following is the response
  code?: string;
  message?: string;

  constructor(init?: Partial<PolicyResponse>) {
    Object.assign(this, init);
  }
}


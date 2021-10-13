import { registerAs } from '@nestjs/config';

export default registerAs('bypass', () => ({
  bypassed: process.env.EASEY_AUTH_API_BYPASS || false,
  environment: process.env.EASEY_AUTH_API_ENV || 'production',
  pass: process.env.EASEY_AUTH_BYPASS_PASS || 'password',
  users: process.env.EASEY_AUTH_API_BYPASS_USERS || '["kherceg-dp"]',
}));

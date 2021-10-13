import { registerAs } from '@nestjs/config';

export default registerAs('bypass', () => ({
  bypassed: process.env.EASEY_AUTH_API_BYPASS || true,
  environment: process.env.EASEY_AUTH_API_ENV || 'development',
  pass: process.env.EASEY_AUTH_BYPASS_PASS || 'password',
}));

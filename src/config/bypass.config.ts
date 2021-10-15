import { registerAs } from '@nestjs/config';

export default registerAs('cdxBypass', () => ({
  enabled: process.env.EASEY_AUTH_API_CDX_BYPASS_ENABLED || false,
  pass: process.env.EASEY_AUTH_API_CDX_BYPASS_PASSWORD || 'IC@nn0tL0g1nIn',
  users: process.env.EASEY_AUTH_API_CDX_BYPASS_USERS || '["kherceg-dp"]',
}));

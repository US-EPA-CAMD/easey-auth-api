import { registerAs } from '@nestjs/config';

export default registerAs('cdxBypass', () => ({
  enabled: process.env.EASEY_AUTH_API_CDX_BYPASS_ENABLED || 'false',
  pass: process.env.EASEY_AUTH_API_CDX_BYPASS_PASSWORD,
  users: process.env.EASEY_AUTH_API_CDX_BYPASS_USERS,
  mockPermissionsEnabled:
    process.env.EASEY_AUTH_API_MOCK_PERMISSIONS_ENABLED || true,
}));

require('dotenv').config();
import { registerAs } from '@nestjs/config';
import { parseBool } from '@us-epa-camd/easey-common/utilities';

export default registerAs('cdxBypass', () => ({
  enabled: parseBool(process.env.EASEY_AUTH_API_CDX_BYPASS_ENABLED, false),
  pass: process.env.EASEY_AUTH_API_CDX_BYPASS_PASSWORD,
  users: process.env.EASEY_AUTH_API_CDX_BYPASS_USERS,
  mockPermissionsEnabled: parseBool(
    process.env.EASEY_AUTH_API_MOCK_PERMISSIONS_ENABLED,
    true,
  ),
}));

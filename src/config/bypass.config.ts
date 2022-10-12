import { registerAs } from '@nestjs/config';
import {
  getConfigValue,
  getConfigValueBoolean,
} from '@us-epa-camd/easey-common/utilities';

require('dotenv').config();

export default registerAs('cdxBypass', () => ({
  enabled: getConfigValueBoolean('EASEY_CDX_BYPASS_ENABLED'),
  users: getConfigValue('EASEY_CDX_BYPASS_USERS'),
  password: getConfigValue('EASEY_CDX_BYPASS_PASSWORD'),
  mockPermissionsEnabled: getConfigValueBoolean(
    'EASEY_CDX_MOCK_PERMISSIONS_ENABLED',
  ),
  mockPermissions: getConfigValue('EASEY_CDX_MOCK_PERMISSIONS'),
}));

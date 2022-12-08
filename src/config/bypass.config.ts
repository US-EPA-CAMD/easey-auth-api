import { registerAs } from '@nestjs/config';
import {
  getConfigValue,
  getConfigValueBoolean,
} from '@us-epa-camd/easey-common/utilities';

require('dotenv').config();

export default registerAs('cdxBypass', () => ({
  enabled: getConfigValueBoolean('EASEY_CDX_BYPASS_ENABLED'),
  users: getConfigValue('EASEY_CDX_BYPASS_USERS'),
  pass: getConfigValue('EASEY_CDX_BYPASS_PASSWORD'),
}));

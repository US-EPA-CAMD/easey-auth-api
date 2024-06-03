import { registerAs } from '@nestjs/config';
import {
  getConfigValue,
  getConfigValueBoolean,
} from '@us-epa-camd/easey-common/utilities';

require('dotenv').config();

export default registerAs('cdxBypass', () => ({
  enabled: getConfigValueBoolean('EASEY_CDX_BYPASS_ENABLED'),
  users: getConfigValue('EASEY_CDX_BYPASS_USERS'),
  userEmail: getConfigValue('EASEY_CDX_BYPASS_USER_EMAIL', 'CAMD_BP_3.1_CBS_Rearch_Mail_Test@easternresearchgroup.onmicrosoft.com'),
}));

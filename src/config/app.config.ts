import { registerAs } from '@nestjs/config';
import {
  getConfigValue,
  getConfigValueNumber,
  getConfigValueBoolean,
} from '@us-epa-camd/easey-common/utilities';

require('dotenv').config();

const host = getConfigValue('EASEY_AUTH_API_HOST', 'localhost');
const port = getConfigValueNumber('EASEY_AUTH_API_PORT', 8000);
const path = getConfigValue('EASEY_AUTH_API_PATH', 'auth-mgmt');

let uri = `https://${host}/${path}`;

if (host == 'localhost') {
  uri = `http://localhost:${port}/${path}`;
}

const apiHost = getConfigValue(
  'EASEY_API_GATEWAY_HOST',
  'api.epa.gov/easey/dev',
);

export default registerAs('app', () => ({
  name: 'auth-api',
  host,
  port,
  path,
  uri,
  apiKey: getConfigValue('EASEY_AUTH_API_KEY'),
  title: getConfigValue(
    'EASEY_AUTH_API_TITLE',
    'Authentication & Authorization',
  ),
  description: getConfigValue(
    'EASEY_AUTH_API_DESCRIPTION',
    'Provides authentication, authorization, & security token services for CAMD applications',
  ),
  env: getConfigValue('EASEY_AUTH_API_ENV', 'local-dev'),
  enableApiKey: getConfigValueBoolean('EASEY_AUTH_API_ENABLE_API_KEY'),
  enableClientToken: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_CLIENT_TOKEN',
  ),
  clientTokenDurationMinutes: getConfigValueNumber(
    'EASEY_AUTH_API_CLIENT_TOKEN_DURATION_MINUTES',
    5,
  ),
  secretToken: getConfigValue('EASEY_AUTH_API_SECRET_TOKEN'),
  enableSecretToken: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_SECRET_TOKEN',
  ),
  enableAuthToken: getConfigValueBoolean('EASEY_AUTH_API_ENABLE_AUTH_TOKEN'),
  tokenExpirationDurationMinutes: getConfigValueNumber(
    'EASEY_AUTH_API_AUTH_TOKEN_DURATION_MINUTES',
    20,
  ),
  enableCors: getConfigValueBoolean('EASEY_AUTH_API_ENABLE_CORS', true),
  enableGlobalValidationPipes: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_GLOBAL_VALIDATION_PIPE',
    true,
  ),
  version: getConfigValue('EASEY_AUTH_API_VERSION', 'v0.0.0'),
  published: getConfigValue('EASEY_AUTH_API_PUBLISHED', 'local'),
  cdxSvcs: getConfigValue(
    'EASEY_CDX_SERVICES',
    'https://devngn.epacdxnode.net/cdx-register-II/services',
  ),
  naasSvcs: getConfigValue(
    'EASEY_NAAS_SERVICES',
    'https://naasdev.epacdxnode.net/xml/securitytoken_v30.wsdl',
  ),
  naasAppId: getConfigValue('EASEY_NAAS_SERVICES_APP_ID'),
  nassAppPwd: getConfigValue('EASEY_NAAS_SERVICES_APP_PASSWORD'),
  // ENABLES DEBUG CONSOLE LOGS
  enableDebug: getConfigValueBoolean('EASEY_AUTH_API_ENABLE_DEBUG'),
  apiHost: apiHost,
  mockPermissions: getConfigValue('EASEY_CDX_MOCK_PERMISSIONS', '[]'),
  permissionsUrl: getConfigValue(
    'EASEY_AUTH_PERMISSIONS_URL',
    'http://localhost:8000/auth-mgmt/permissions',
  ),
}));

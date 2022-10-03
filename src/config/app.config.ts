import { registerAs } from '@nestjs/config';
import {
  getConfigValue,
  getConfigValueNumber,
  getConfigValueBoolean,
} from '@us-epa-camd/easey-common/utilities';

require('dotenv').config();

const path = getConfigValue('EASEY_AUTH_API_PATH', 'auth-mgmt');
const host = getConfigValue('EASEY_AUTH_API_HOST', 'localhost');
const port = getConfigValueNumber('EASEY_AUTH_API_PORT', 8000);

let uri = `https://${host}/${path}`;

if (host == 'localhost') {
  uri = `http://localhost:${port}/${path}`;
}

export default registerAs('app', () => ({
  name: 'auth-api',
  host, port, path, uri,
  title: getConfigValue(
    'EASEY_AUTH_API_TITLE', 'Authentication & Authorization',
  ),
  description: getConfigValue(
    'EASEY_AUTH_API_DESCRIPTION',
    'Provides authentication, authorization, & security token services for CAMD applications',
  ),
  apiHost: getConfigValue(
    'EASEY_API_GATEWAY_HOST', 'api.epa.gov/easey/dev',
  ),
  env: getConfigValue(
    'EASEY_AUTH_API_ENV', 'local-dev',
  ),
  enableCors: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_CORS', true,
  ),
  enableApiKey: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_API_KEY',
  ),
  enableAuthToken: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_AUTH_TOKEN',
  ),
  enableClientToken: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_CLIENT_TOKEN',
  ),
  enableGlobalValidationPipes: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_GLOBAL_VALIDATION_PIPE', true,
  ),
  version: getConfigValue(
    'EASEY_AUTH_API_VERSION', 'v0.0.0',
  ),
  published: getConfigValue(
    'EASEY_AUTH_API_PUBLISHED', 'local',
  ),
  naasAppId: getConfigValue(
    'EASEY_NAAS_SERVICES_APP_ID',
  ),
  nassAppPwd: getConfigValue(
    'EASEY_NAAS_SERVICES_APP_PASSWORD',
  ),
  tokenExpirationDurationMinutes: getConfigValueNumber(
    'EASEY_AUTH_API_AUTH_TOKEN_DURATION_MINUTES', 20,
  ),
  clientTokenDurationMinutes: getConfigValueNumber(
    'EASEY_AUTH_API_CLIENT_TOKEN_DURATION_MINUTES', 5,
  ),
  cdxSvcs: getConfigValue(
    'EASEY_CDX_SERVICES', 'https://devngn.epacdxnode.net/cdx-register-II/services',
  ),
  naasSvcs: getConfigValue(
    'EASEY_NAAS_SERVICES', 'https://naasdev.epacdxnode.net/xml/securitytoken_v30.wsdl',
  ),
  contentUrl: getConfigValue(
    'EASEY_CONTENT_API', 'https://api.epa.gov/easey/dev/content-mgmt',
  ),
  secretToken: getConfigValue(
    'EASEY_AUTH_API_SECRET_TOKEN',
  ),
  enableSecretToken: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_SECRET_TOKEN',
  ),
  // ENABLES DEBUG CONSOLE LOGS
  enableDebug: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_DEBUG',
  ),
}));

require('dotenv').config();
import { registerAs } from '@nestjs/config';
import { parseBool } from '@us-epa-camd/easey-common/utilities';

const path = process.env.EASEY_AUTH_API_PATH || 'auth-mgmt';
const host = process.env.EASEY_AUTH_API_HOST || 'localhost';
const port = +process.env.EASEY_AUTH_API_PORT || 8000;

let uri = `https://${host}/${path}`;

if (host == 'localhost') {
  uri = `http://localhost:${port}/${path}`;
}

export default registerAs('app', () => ({
  name: 'auth-api',
  title: process.env.EASEY_AUTH_API_TITLE || 'Authentication & Authorization',
  path,
  host,
  apiHost: process.env.EASEY_API_GATEWAY_HOST || 'api.epa.gov/easey/dev',
  port,
  uri,
  env: process.env.EASEY_AUTH_API_ENV || 'local-dev',
  enableCors: parseBool(process.env.EASEY_FACILITIES_API_ENABLE_CORS, true),
  enableApiKey: parseBool(
    process.env.EASEY_FACILITIES_API_ENABLE_API_KEY,
    true,
  ),
  enableAuthToken: parseBool(
    process.env.EASEY_FACILITIES_API_ENABLE_AUTH_TOKEN,
    true,
  ),
  enableGlobalValidationPipes: parseBool(
    process.env.EASEY_FACILITIES_API_ENABLE_GLOBAL_VALIDATION_PIPE,
    true,
  ),
  version: process.env.EASEY_AUTH_API_VERSION || 'v0.0.0',
  published: process.env.EASEY_AUTH_API_PUBLISHED || 'local',
  naasAppId: process.env.EASEY_AUTH_API_NAASID,
  nassAppPwd: process.env.EASEY_AUTH_API_NAASPWD,
  tokenExpirationDurationMinutes:
    process.env.EASEY_AUTH_API_TOKEN_EXPIRATION_MINUTES || 1,
  clientTokenDurationMinutes:
    process.env.EASEY_AUTH_API_CLIENT_TOKEN_DURATION_MINUTES || 5,
  cdxSvcs:
    process.env.EASEY_CDX_SERVICES ||
    'https://devngn.epacdxnode.net/cdx-register-II/services',
  naasSvcs:
    process.env.EASEY_NAAS_SERVICES ||
    'https://naasdev.epacdxnode.net/xml/securitytoken_v30.wsdl',
  contentUrl:
    process.env.EASEY_CONTENT_API ||
    'https://api.epa.gov/easey/dev/content-mgmt',
}));

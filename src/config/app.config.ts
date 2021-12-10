import { registerAs } from '@nestjs/config';

const path = process.env.EASEY_AUTH_API_PATH || 'auth-mgmt';
const host = process.env.EASEY_AUTH_API_HOST || 'localhost';
const port = process.env.EASEY_AUTH_API_PORT || 8000;

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
  version: process.env.EASEY_AUTH_API_VERSION || 'v0.0.0',
  published: process.env.EASEY_AUTH_API_PUBLISHED || 'local',
  naasAppId: process.env.EASEY_AUTH_API_NAASID,
  nassAppPwd: process.env.EASEY_AUTH_API_NAASPWD,
  cdxSvcs:
    process.env.EASEY_CDX_SERVICES ||
    'https://devngn.epacdxnode.net/cdx-register-II/services',
  naasSvcs:
    process.env.EASEY_NAAS_SERVICES ||
    'https://naasdev.epacdxnode.net/xml/securitytoken_v30.wsdl',
}));

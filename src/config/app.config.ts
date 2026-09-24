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
  enableAuthToken: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_AUTH_TOKEN',
    true,
  ),
  tokenExpirationDurationMinutes: getConfigValueNumber(
    'EASEY_AUTH_API_AUTH_TOKEN_DURATION_MINUTES',
    20,
  ),
  enableCors: getConfigValueBoolean('EASEY_AUTH_API_ENABLE_CORS', true),
  enableGlobalValidationPipes: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_GLOBAL_VALIDATION_PIPE',
    true,
  ),
  enableReplicaDbAccess: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_REPLICA_DB_ACCESS',
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
  // ENABLES DEBUG CONSOLE LOGS
  enableDebug: getConfigValueBoolean('EASEY_AUTH_API_ENABLE_DEBUG'),
  apiHost: apiHost,
  mockPhoneNumber: getConfigValue('EASEY_AUTH_API_MOCK_PHONE_NUMBER', ''),
  mockPermissionsUrl: getConfigValue(
    'EASEY_AUTH_API_MOCK_PERMISSIONS_URL',
    'https://api.epa.gov/easey/dev/auth-mgmt/permissions',
  ),
  permissionsUrl: getConfigValue(
    'EASEY_AUTH_API_PERMISSIONS_URL',
    'https://cbsstagei.rtpnc.epa.gov/CBSD/api/auth-mgmt/responsibilities',
  ),
  permissionsMethod: getConfigValue('EASEY_AUTH_API_PERMISSIONS_METHOD', 'GET'),
  contentUri: getConfigValue(
    'EASEY_AUTH_CONTENT_API',
    'https://api.epa.gov/easey/dev/content-mgmt',
  ),
  dataFlow: getConfigValue('EASEY_AUTH_API_DATA_FLOW', 'EASEY'),
  mockPermissionsEnabled: getConfigValueBoolean(
    'EASEY_AUTH_API_MOCK_PERMISSIONS_ENABLED',
    false,
  ),
  refreshTokenThresholdSeconds: getConfigValueNumber(
    'EASEY_AUTH_API_REFRESH_TOKEN_THRESHOLD_SECONDS',
    60,
  ),
  enableAllFacilities: getConfigValueBoolean(
    'EASEY_AUTH_API_ENABLE_ALL_FACILITIES',
    false,
  ),
  appStatus: getConfigValue(
    'EASEY_AUTH_API_APP_STATUS',
    'DOWN',
  ),
  authApi: {
    uri: getConfigValue('EASEY_AUTH_API', `https://${apiHost}/auth-mgmt`),
  },
  signFilesIndividually: getConfigValueBoolean(
    'EASEY_AUTH_API_SIGN_FILES_INDIVIDUALLY',
    false,
  ),
  maintenanceBypassUsers: JSON.parse(getConfigValue('EASEY_MAINTENANCE_BYPASS_USERS', '[]')),
  enableAuditLog: getConfigValueBoolean('EASEY_AUTH_API_ENABLE_AUDIT_LOG', true),
  disableClientIpValidation: getConfigValueBoolean('EASEY_AUTH_API_DISABLE_CLIENT_IP_VALIDATION', false),

  maxConnectionPool: getConfigValueNumber('EASEY_DB_MAX_CONNECTION_POOL',15),
  idleTimeout: getConfigValueNumber( 'EASEY_DB_IDLE_TIMEOUT', 30000, ),
  connectionTimeout: getConfigValueNumber('EASEY_DB_CONNECTION_TIMEOUT',10000),
  statementTimeout: getConfigValueNumber('EASEY_DB_STATEMENT_TIMEOUT',300000),
  idleInTransactionSessionTimeout: getConfigValueNumber('EASEY_DB_IDLE_TRANS_SESSION_TIMEOUT',300000),
  maxUsesBeforeRecreatingConnection: getConfigValueNumber('EASEY_DB_MAX_USES_BEFORE_CONN_RECREATE',500),
  sqlLogging: getConfigValue('EASEY_DB_SQL_LOGGING', "error"),
  maxQueryExecutionTime: getConfigValueNumber('EASEY_DB_MAX_QUERY_EXECUTION_TIMEOUT',30000),
}));

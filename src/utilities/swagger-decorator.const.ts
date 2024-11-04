import {
    ApiExcludeEndpoint,
    ApiExcludeController,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';

const env = getConfigValue('EASEY_AUTH_API_ENV', 'local-dev');
const disable = [
    'dev',
    'tst',
    'test',
    'develop',
    'development',
    'local-dev',
    'perf',
    'beta'
].includes(env)

export function ApiExcludeControllerByEnv() {
    return applyDecorators(ApiExcludeController(disable));
}

export function ApiExcludeEndpointByEnv() {
    return applyDecorators(ApiExcludeEndpoint(disable));
}

import { HttpStatus, HttpException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';

export const AuthToken = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    // MUST BE A BEARER TOKEN PRESENT IN AUTHORIZATION HEADER IN THE FORM OF
    // headers { authorization: Bearer <auth token goes here> }
    const header = request.headers?.authorization;
    if (!header)
      throw new LoggingException('Authorization token is missing.', HttpStatus.UNAUTHORIZED);

    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer')
      throw new LoggingException('Authorization token is invalid.', HttpStatus.UNAUTHORIZED);

    return parts[1];
  },
);

export default AuthToken;

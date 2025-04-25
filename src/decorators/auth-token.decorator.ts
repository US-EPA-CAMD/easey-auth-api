import { createParamDecorator, ExecutionContext, HttpStatus } from '@nestjs/common';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';

export const AuthToken = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    // MUST BE A BEARER TOKEN PRESENT IN AUTHORIZATION HEADER IN THE FORM OF
    // headers { authorization: Bearer <auth token goes here> }

    // Check if authorization header exists
    if (!request.headers.authorization) {
      throw new EaseyException(
        new Error('Authorization header is missing'),
        HttpStatus.UNAUTHORIZED
      );
    }

    // Check if authorization header has the correct format
    const parts = request.headers.authorization.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new EaseyException(
        new Error('Invalid authorization format. Expected "Bearer <token>"'),
        HttpStatus.UNAUTHORIZED
      );
    }

    // Return the token part
    return parts[1];
  },
);

export default AuthToken;

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthToken = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    // MUST BE A BEARER TOKEN PRESENT IN AUTHORIZATION HEADER IN THE FORM OF
    // headers { authorization: Bearer <auth token goes here> }
    return request.headers.authorization.split(' ')[1];
  },
);

export default AuthToken;

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    if (request.headers['x-client-ip']) {
      console.log('X Client IP: ' + request.headers['x-client-ip']);
      return request.headers['x-client-ip'];
    }

    console.log('X-Forwarded-For: ' + request.headers['x-forwarded-for']);

    return request.headers['x-forwarded-for'];
  },
);

export default ClientIP;

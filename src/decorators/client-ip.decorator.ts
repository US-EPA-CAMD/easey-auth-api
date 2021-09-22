import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    if (request.headers['x-client-ip']) {
      return request.headers['x-client-ip'];
    }

    console.log(`request.ip: ${request.ip}`);
    console.log(
      `request.connection.remoteAddress: ${request.connection.remoteAddress}`,
    );
    console.log(`x-forwarded-for: ${request.headers['x-forwarded-for']}`);
    return request.ip;
  },
);

export default ClientIP;

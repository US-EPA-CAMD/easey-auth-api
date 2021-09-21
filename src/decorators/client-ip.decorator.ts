import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    if (request.headers['x-client-ip']) {
      return request.headers['x-client-ip'];
    }

    return request.ip;
  },
);

export default ClientIP;

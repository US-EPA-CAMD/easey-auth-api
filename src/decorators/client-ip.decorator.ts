import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    if (request.headers['ip']) {
      return request.headers['ip'];
    }

    return request.ip;
  },
);

export default ClientIP;

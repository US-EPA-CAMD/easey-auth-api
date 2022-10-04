import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    console.log('REQUEST: ');
    console.log(request);

    if (request.body.clientIp) {
      return request.body.clientIp;
    }

    if (request.headers['x-forwarded-for']) {
      const forwarded = request.headers['x-forwarded-for'].split(',')[0];
      return forwarded;
    }

    return request.ip;
  },
);

export default ClientIP;

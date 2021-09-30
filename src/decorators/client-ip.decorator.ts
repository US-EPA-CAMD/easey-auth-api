import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    if (request.body.clientIp) {
      console.log('Using passed clientIp ' + request.body.clientIp);
      return request.body.clientIp;
    }

    if (request.headers['x-forwarded-for']) {
      const forwarded = request.headers['x-forwarded-for'].split(',')[0];
      console.log('Using X-Forwarded-For ' + forwarded);
      return forwarded;
    }

    console.log('Defaulting to IP ' + request.ip);
    return request.ip;
  },
);

export default ClientIP;

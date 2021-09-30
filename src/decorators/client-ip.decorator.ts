import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    if (request.body.clientIp) {
      console.log('Using passed clientIp ' + request.body.clientIp);
      return request.body.clientIp;
    }

    if (request.headers['x-forwarded-for']) {
      console.log(
        'Using X-Forwarded-For ' +
          request.headers['x-forwarded-for'].split(',')[0],
      );
      return request.headers['x-forwarded-for'].split(',')[0];
    }

    console.log('Defaulting to IP ' + request.ip);
    return request.ip;
  },
);

export default ClientIP;

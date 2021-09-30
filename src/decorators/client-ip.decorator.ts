import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    if (request.headers['x-client-ip']) {
      console.log('Using X-Client-IP ' + request.headers['x-client-ip']);
      return request.headers['x-client-ip'];
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

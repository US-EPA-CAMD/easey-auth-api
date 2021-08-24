import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ClientIP = createParamDecorator(
  (data: never, context: ExecutionContext) => {
    return context.switchToHttp().getRequest().ip;
  },
);

export default ClientIP;

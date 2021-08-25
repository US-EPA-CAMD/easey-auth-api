import { Module } from '@nestjs/common';

import { TokenController } from './token.controller';
import { AuthenticationModule } from '../authentication/authentication.module';

@Module({
  controllers: [TokenController],
  imports: [AuthenticationModule],
})
export class TokenModule {}

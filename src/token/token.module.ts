import { Module, forwardRef } from '@nestjs/common';

import { TokenController } from './token.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSessionRepository } from '../user-session/user-session.repository';
import { TokenService } from './token.service';
import { ApiRepository } from './api.repository';
import { TokenBypassService } from './token-bypass.service';
import { TokenClientService } from './token-client.service';
import { UserSessionModule } from '../user-session/user-session.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSessionRepository, ApiRepository]),
    forwardRef(() => UserSessionModule),
  ],
  controllers: [TokenController],
  providers: [TokenService, TokenBypassService, TokenClientService],
  exports: [TypeOrmModule, TokenService, TokenBypassService],
})
export class TokenModule {}

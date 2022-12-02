import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { UserSessionService } from './user-session.service';
import { UserSessionRepository } from './user-session.repository';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([UserSessionRepository]), HttpModule],
  controllers: [],
  providers: [UserSessionService, ConfigService],
  exports: [TypeOrmModule, UserSessionService],
})
export class UserSessionModule {}

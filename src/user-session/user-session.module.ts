import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

import { UserSessionService } from './user-session.service';
import { UserSession } from '../entities/user-session.entity';
import { UserSessionRepository } from './user-session.repository';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([UserSession]), HttpModule],
  controllers: [],
  providers: [UserSessionService, ConfigService, UserSessionRepository],
  exports: [TypeOrmModule, UserSessionService],
})
export class UserSessionModule {}

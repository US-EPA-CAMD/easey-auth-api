import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserSessionService } from './user-session.service';
import { UserSessionRepository } from './user-session.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSessionRepository]),
  ],
  controllers: [],
  providers: [UserSessionService],
  exports: [
    TypeOrmModule,
    UserSessionService,
  ],
})
export class UserSessionModule {}

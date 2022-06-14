import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenModule } from 'src/token/token.module';
import { UserSessionRepository } from './user-session.repository';
import { UserSessionService } from './user-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserSessionRepository]),
    forwardRef(() => TokenModule),
  ],
  providers: [UserSessionService],
  exports: [TypeOrmModule, UserSessionService],
})
export class UserSessionModule {}

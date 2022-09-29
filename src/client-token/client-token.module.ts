import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClientTokenController } from './client-token.controller';
import { ClientTokenRepository } from './client-token.repository';
import { ClientTokenService } from './client-token.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientTokenRepository]),
  ],
  controllers: [ClientTokenController],
  providers: [ClientTokenService],
  exports: [TypeOrmModule],
})
export class ClientTokenModule {}
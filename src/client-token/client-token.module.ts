import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClientTokenController } from './client-token.controller';
import { ClientTokenRepository } from './client-token.repository';
import { ClientTokenService } from './client-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientTokenRepository]), HttpModule],
  controllers: [ClientTokenController],
  providers: [ClientTokenRepository, ClientTokenService],
  exports: [TypeOrmModule],
})
export class ClientTokenModule {}

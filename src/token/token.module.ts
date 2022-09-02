import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TokenController } from './token.controller';
import { TokenClientService } from './token-client.service';
import { ClientConfigRepository } from './client-config.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientConfigRepository]),
  ],
  controllers: [TokenController],
  providers: [TokenClientService],
  exports: [TypeOrmModule],
})
export class TokenModule {}

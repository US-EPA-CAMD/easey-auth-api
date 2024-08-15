import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MiddlewareConsumer } from '@nestjs/common/interfaces/middleware';
import { ValidateHostMiddleWare } from 'src/client-token/client-token.middleware';
import { ClientTokenController } from './client-token.controller';
import { ClientTokenRepository } from './client-token.repository';
import { ClientTokenService } from './client-token.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientTokenRepository]), HttpModule],
  controllers: [ClientTokenController],
  providers: [ClientTokenRepository, ClientTokenService],
  exports: [TypeOrmModule],
})
export class ClientTokenModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ValidateHostMiddleWare).forRoutes('*');
  }
}

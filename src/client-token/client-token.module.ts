import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClientTokenController } from './client-token.controller';
import { ClientTokenRepository } from './client-token.repository';
import { ClientTokenService } from './client-token.service';
import { MiddlewareConsumer } from '@nestjs/common/interfaces/middleware';
import { ValidateHostMiddleWare } from 'src/client-token/client-token.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientTokenRepository]),
    HttpModule,
  ],
  controllers: [ClientTokenController],
  providers: [ClientTokenService],
  exports: [TypeOrmModule],
})
export class ClientTokenModule {
  configure(consumer: MiddlewareConsumer){
    consumer.apply(ValidateHostMiddleWare).forRoutes('*')
  }
}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { ClientTokenModule } from './../client-token/client-token.module';

@Module({
  imports: [
    HttpModule,
    ClientTokenModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class TokenModule {}

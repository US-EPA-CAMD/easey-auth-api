import { Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { SignController } from './Sign.controller';
import { SignService } from './Sign.service';

@Module({
  imports: [],
  controllers: [SignController],
  providers: [SignService, ConfigService],
})
export class SignModule {}

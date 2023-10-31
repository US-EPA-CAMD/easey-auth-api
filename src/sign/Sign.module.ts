import { Module } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { SignController } from './Sign.controller';
import { SignService } from './Sign.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [SignController],
  providers: [SignService, ConfigService],
  exports: [SignService],
})
export class SignModule {}

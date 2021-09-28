import { Global, Module } from '@nestjs/common';
import Logger from './Logger.service';

@Global()
@Module({
  providers: [Logger],
  exports: [Logger],
})
export class LogModule {}

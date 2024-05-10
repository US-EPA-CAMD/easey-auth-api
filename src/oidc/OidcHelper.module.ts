import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { OidcHelperService } from './OidcHelperService';
import { BypassService } from './Bypass.service';

@Module({
  imports: [HttpModule, LoggerModule],
  controllers: [],
  providers: [OidcHelperService,BypassService],
  exports: [OidcHelperService, BypassService],
})
export class OidcHelperModule {}

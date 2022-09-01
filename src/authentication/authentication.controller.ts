import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { Controller } from '@nestjs/common';

@Controller()
@ApiSecurity('APIKey')
@ApiTags('Authentication')
export class AuthenticationController {
}

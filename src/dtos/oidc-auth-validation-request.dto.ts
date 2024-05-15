import { IsOptional, IsString } from 'class-validator';

export class OidcAuthValidationRequestDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  error?: string;

  @IsString()
  @IsOptional()
  error_description?: string;
}

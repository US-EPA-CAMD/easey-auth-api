import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificationStatementMap } from '../maps/certification-statement.map';
import { AuthModule } from '../auth/auth.module';
import { CertificationsController } from './certifications.controller';
import { CertificationStatementRepository } from './certifications.repository';
import { CertificationsService } from './certifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CertificationStatementRepository]),
    AuthModule,
  ],
  controllers: [CertificationsController],
  providers: [CertificationsService, CertificationStatementMap, ConfigService],
})
export class CertificationsModule {}

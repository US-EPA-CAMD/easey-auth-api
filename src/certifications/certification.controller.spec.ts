import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CertificationsController } from './certifications.controller';
import { CertificationsService } from './certifications.service';

jest.mock('../guards/auth.guard');
jest.mock('./certifications.service');
describe('Certification Controller', () => {
  let controller: CertificationsController;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [CertificationsController],
      providers: [CertificationsService, ConfigService],
    }).compile();
    controller = module.get(CertificationsController);
  });
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('statements', () => {
    expect(async () => {
      await controller.statements({ monitorPlanIds: [] });
    }).not.toThrowError();
  });
});

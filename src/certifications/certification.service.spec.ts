import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CertificationsService } from './certifications.service';
import { CertificationStatementRepository } from './certifications.repository';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { CertificationStatement } from '../entities/certification-statement.entity';

const mockRepository = () => ({
  findOne: jest.fn().mockResolvedValue(new CertificationStatement()),
});
describe('Certification Controller', () => {
  let service: CertificationsService;
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [],
      providers: [
        {
          provide: CertificationStatementRepository,
          useFactory: mockRepository,
        },
        CertificationsService,
        ConfigService,
      ],
    }).compile();
    service = module.get(CertificationsService);
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should function correctly and build a list of cert statements and their associated facilities', async () => {
    jest.spyOn(service, 'returnManager').mockReturnValue({
      query: jest.fn().mockResolvedValue([
        {
          prg_cd: null,
          oris_code: '3',
          facility_name: 'Barry',
          unit_info: '5',
        },
        {
          prg_cd: 'MATS',
          oris_code: '3',
          facility_name: 'Barry',
          unit_info: '5',
        },
      ]),
    });

    const result = await service.getStatements(['']);

    expect(result.length).toEqual(2);
    expect(result[0].prgCode).toEqual('null');
    expect(result[1].prgCode).toEqual('MATS');
  });
});

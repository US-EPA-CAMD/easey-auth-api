import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';
import { ConfigService } from '@nestjs/config';
import { EntityManager, DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { URL } from 'url';

import { CertificationsService } from './certifications.service';
import { CertificationStatementRepository } from './certifications.repository';
import { CertificationStatement } from '../entities/certification-statement.entity';

// Mock the withSlaveConnection utility
jest.mock('@us-epa-camd/easey-common/connection', () => ({
  withSlaveConnection: jest.fn(),
}));

jest.mock('url', () => {
  return {
    URL: class {
      href = 'https://statements/statement.pdf';
      constructor(path: string, base: string) {
     }
    },
  };
});

const mockRepository = () => ({
  findOneBy: jest.fn().mockResolvedValue(new CertificationStatement()),
});

const mockDataSource = {
  createQueryRunner: jest.fn(),
};

const mockHttpService = {
  get: jest.fn(),
  post: jest.fn(),
};
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
        {
          provide: EntityManager,
          useValue: { query: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: HttpService,
          useValue: mockHttpService
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
    const { withSlaveConnection } = require('@us-epa-camd/easey-common/connection');

    mockHttpService.get.mockReturnValue(
    of({ data: '<html><body>Certification Content</body></html>' })
    );

    // Mock withSlaveConnection to execute the operation with mocked data
    withSlaveConnection.mockImplementation(async (dataSource, operation) => {
      // For the main query operation
      if (operation.toString().includes('query')) {
        const mockManager = {
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
    };
        return await operation(mockManager);
      } else {
        // For repository operations
        const mockManager = {
          getRepository: jest.fn().mockReturnValue({
            findOneBy: jest.fn().mockResolvedValue(new CertificationStatement()),
          }),
        };
        return await operation(mockManager);
      }
    });

    const result = await service.getStatements(['']);

    expect(result.length).toEqual(2);
    expect(result[0].prgCode).toEqual('null');
    expect(result[1].prgCode).toEqual('MATS');
    expect(withSlaveConnection).toHaveBeenCalled();
  });
});

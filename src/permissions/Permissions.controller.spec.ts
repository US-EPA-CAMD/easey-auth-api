import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule } from '@us-epa-camd/easey-common/logger';

import { PermissionsController } from './Permissions.controller';
import { PermissionsService } from './Permissions.service';

const mockService = () => ({
  getMockPermissions: jest.fn(),
});

describe('PermissionsController', () => {
  let controller: PermissionsController;
  let service: PermissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
      controllers: [PermissionsController],
      providers: [
        {
          provide: PermissionsService,
          useFactory: mockService,
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    const mockFunction = jest.fn();
    service.getMockPermissions = mockFunction;
    controller.getPermissions('');
    expect(mockFunction).toHaveBeenCalled();
  });
});

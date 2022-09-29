// import { AuthenticationController } from './authentication.controller';
// import { AuthenticationService } from './authentication.service';
// import { Test, TestingModule } from '@nestjs/testing';
// import { UserDTO } from '../dtos/user.dto';
// import { CredentialsDTO } from '../dtos/credentials.dto';
// import { AuthGuard } from '../guards/auth.guard';
// import { UserSessionRepository } from '../user-session/user-session.repository';
// import { Logger } from '@nestjs/common';
// import { LoggerModule } from '@us-epa-camd/easey-common/logger';
// import { UserTokenDTO } from '../dtos/user-token.dto';

// jest.mock('./authentication.service');

// const mockRepo = () => ({
//   findOne: jest.fn().mockResolvedValue(''),
// });

// const mockService = () => ({
//   signIn: jest.fn().mockResolvedValue(new UserDTO()),
//   signOut: jest.fn().mockResolvedValue(true),
//   getCookieOptions: jest.fn().mockReturnValue({}),
// });

// describe('Authentication Controller', () => {
//   let controller: AuthenticationController;
//   let service: AuthenticationService;

//   beforeAll(async () => {
//     const module: TestingModule = await Test.createTestingModule({
//       imports: [LoggerModule],
//       controllers: [AuthenticationController],
//       providers: [
//         { provide: AuthenticationService, useFactory: mockService },
//         AuthGuard,
//         Logger,
//         { provide: UserSessionRepository, useFactory: mockRepo },
//       ],
//     }).compile();

//     controller = module.get(AuthenticationController);
//     service = module.get(AuthenticationService);
//   });

//   it('should be defined', () => {
//     expect(controller).toBeDefined();
//   });

//   describe('signIn', () => {
//     it('should return a new or existing UserDTO', async () => {
//       const data = new UserDTO();
//       jest.spyOn(service, 'signIn').mockResolvedValue(data);
//       const cred = new CredentialsDTO();
//       expect(await controller.signIn(cred, '')).toBe(data);
//     });
//   });

//   describe('signOut', () => {
//     it('should call the service sign out given a valid request', async () => {
//       const signOut = jest.spyOn(service, 'signOut').mockResolvedValue();
//       controller.signOut(new UserTokenDTO());
//       expect(signOut).toHaveBeenCalled();
//     });
//   });
// });

import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { createClientAsync } from 'soap';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';

interface Question {
  questionId: string;
  text: string;
}

@Injectable()
export class SignService {
  constructor(
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  async getRegisterServiceToken(): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
        });
      })
      .then(res => {
        return res[0].securityToken;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  async getUserMobileNumbers(token, userId): Promise<string[]> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.RetrieveUserMobileAsync({
          securityToken: token,
          user: { userId: userId },
        });
      })
      .then(res => {
        if (res[0].return) {
          return res[0].return.map(n => n.MobilePhone);
        }

        return null;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  async getSignServiceToken(): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateAsync({
          userId: this.configService.get<string>('app.naasAppId'),
          credential: this.configService.get<string>('app.nassAppPwd'),
        });
      })
      .then(res => {
        return res[0].securityToken;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  async sendPhoneVerification(
    token: string,
    activityId: string,
    userId: string,
    phone: string,
  ): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.GenerateAndSendSecretCodeAsync({
          securityToken: token,
          activityId: activityId,
          userId: userId,
          mobilePhone: phone,
          secretCodeType: 'SMS',
        });
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  async signFile(
    token: string,
    activityId: string,
    file: Express.Multer.File,
  ): Promise<void> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    try {
      this.logger.log(`Signing ${file.originalname}...`);
      const client = await createClientAsync(url);

      await client.SignAsync({
        securityToken: token,
        activityId: activityId,
        signatureDocument: {
          Name: file.originalname,
          Format: 'BIN',
          Content: {
            $value: file.buffer.toString('base64'),
            $type: 'base64Binary',
          },
        },
      });
      this.logger.log(`Successfully signed: ${file.originalname}`);
    } catch (error) {
      throw new EaseyException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async signAllFiles(activityId: string, files: Array<Express.Multer.File>) {
    const token = await this.getSignServiceToken();
    for (const file of files) {
      await this.signFile(token, activityId, file);
    }
  }

  async getActivityId(
    token: string,
    userId: string,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.CreateActivityAsync({
          securityToken: token,
          signatureUser: {
            UserId: userId,
            FirstName: firstName,
            LastName: lastName,
          },
          dataflowName: this.configService.get<string>('app.dataFlow'),
        });
      })
      .then(res => {
        return res[0].activityId;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(new Error(err), HttpStatus.BAD_REQUEST);
      });
  }

  async authenticateUser(
    token: string,
    activityId: string,
    userId: string,
    password: string,
  ) {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.AuthenticateUserAsync({
          securityToken: token,
          activityId: activityId,
          userId: userId,
          password: password,
        });
      })
      .then(res => {
        this.logger.log('Authenticated sign authentication for user');
      })
      .catch(err => {
        const innerError =
          err.root?.Envelope?.Body?.Fault?.detail?.RegisterFault;

        if (innerError) {
          let responseMessage = 'Invalid username or password.';
          if (innerError.errorCode['$value'] !== 'E_WrongIdPassword') {
            responseMessage = innerError.description;
          }

          throw new EaseyException(err, HttpStatus.BAD_REQUEST, {
            responseObject: responseMessage,
          });
        }

        throw new EaseyException(err, HttpStatus.INTERNAL_SERVER_ERROR, {
          userId: userId,
        });
      });
  }

  async getQuestion(
    token: string,
    activityId: string,
    userId: string,
  ): Promise<Question> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.GetQuestionAsync({
          securityToken: token,
          activityId: activityId,
          userId: userId,
        });
      })
      .then(res => {
        return {
          questionId: res[0].question.questionId,
          text: res[0].question.text,
        };
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  validateQuestion(
    token: string,
    activityId: string,
    questionId: string,
    answer: string,
    userId: string,
  ): Promise<boolean> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.ValidateAnswerAsync({
          securityToken: token,
          activityId: activityId,
          userId: userId,
          questionId: questionId,
          answer: answer,
        });
      })
      .then(res => {
        return true;
      })
      .catch(err => {
        const innerError =
          err.root?.Envelope?.Body?.Fault?.detail?.RegisterFault;

        if (innerError) {
          throw new EaseyException(err, HttpStatus.BAD_REQUEST, {
            responseObject: innerError.description,
          });
        }

        throw new EaseyException(err, HttpStatus.INTERNAL_SERVER_ERROR, {
          userId: userId,
        });
      });
  }

  validatePin(
    token: string,
    activityId: string,
    userId: string,
    code: string,
  ): Promise<boolean> {
    const url = `${this.configService.get<string>(
      'app.cdxSvcs',
    )}/RegisterSignService?wsdl`;

    return createClientAsync(url)
      .then(client => {
        return client.ValidateSecretCodeAsync({
          securityToken: token,
          activityId: activityId,
          userId: userId,
          secretCode: code,
        });
      })
      .then(res => {
        return true;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new EaseyException(
            new Error(JSON.stringify(err.root.Envelope)),
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new EaseyException(err, HttpStatus.BAD_REQUEST);
      });
  }

  async authenticate(
    credentials: CredentialsSignDTO,
    user: CurrentUser,
  ): Promise<SignAuthResponseDTO> {
    const token = await this.getSignServiceToken();

    const activityId = await this.getActivityId(
      token,
      credentials.userId,
      credentials.firstName,
      credentials.lastName,
    );
    await this.authenticateUser(
      token,
      activityId,
      credentials.userId,
      credentials.password,
    );

    //Extra error handling
    if (user.userId !== credentials.userId) {
      throw new EaseyException(
        new Error('Must authenticate with the current logged in account'),
        HttpStatus.BAD_REQUEST,
        {
          responseObject:
            'Must authenticate with the current logged in account',
        },
      );
    }

    if (!(user.roles.includes('Submitter') || user.roles.includes('Sponsor') || user.roles.includes('Initial Authorizer')) ) {
      throw new EaseyException(
        new Error('This requires the Sponsor or Submitter role'),
        HttpStatus.BAD_REQUEST,
        {
          responseObject: 'This requires the Sponsor, Submitter, or Initial Authorizer role',
        },
      );
    }

    const question = await this.getQuestion(
      token,
      activityId,
      credentials.userId,
    );

    const dto = new SignAuthResponseDTO();
    dto.activityId = activityId;
    dto.question = question.text;
    dto.questionId = question.questionId;
    dto.mobileNumbers = [];

    return dto;
  }

  async sendPhoneVerificationCode(
    payload: SendPhonePinParamDTO,
  ): Promise<void> {
    const token = await this.getSignServiceToken();

    await this.sendPhoneVerification(
      token,
      payload.activityId,
      payload.userId,
      payload.number,
    );
  }

  async validate(payload: CertificationVerifyParamDTO): Promise<boolean> {
    const token = await this.getSignServiceToken();

    if (payload.pin && payload.pin !== '') {
      //Phone verification
      await this.validatePin(
        token,
        payload.activityId,
        payload.userId,
        payload.pin,
      );
    } else {
      // Question verification
      await this.validateQuestion(
        token,
        payload.activityId,
        payload.questionId,
        payload.answer,
        payload.userId,
      );
    }

    return true;
  }
}

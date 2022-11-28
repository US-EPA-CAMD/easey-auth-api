import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingException } from '@us-epa-camd/easey-common/exceptions';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { createClientAsync } from 'soap';
import { CertificationVerifyParamDTO } from '../dtos/certification-verify-param.dto';
import { CredentialsSignDTO } from '../dtos/certification-sign-param.dto';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';

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
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
      });
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
          dataflowName: 'EASEY',
        });
      })
      .then(res => {
        return res[0].activityId;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
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
        this.logger.info('Authenticated sign authentication for user', {
          userId: userId,
        });
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
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
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
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
        console.log(res);
        return true;
      })
      .catch(err => {
        if (err.root && err.root.Envelope) {
          throw new LoggingException(err.root.Envelope, HttpStatus.BAD_REQUEST);
        }

        throw new LoggingException(err.message, HttpStatus.BAD_REQUEST);
      });
  }

  async authenticate(
    credentials: CredentialsSignDTO,
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

    const question = await this.getQuestion(
      token,
      activityId,
      credentials.userId,
    );

    const dto = new SignAuthResponseDTO();
    dto.activityId = activityId;
    dto.question = question.text;
    dto.questionId = question.questionId;

    return dto;
  }

  async validate(payload: CertificationVerifyParamDTO): Promise<boolean> {
    const token = await this.getSignServiceToken();

    await this.validateQuestion(
      token,
      payload.activityId,
      payload.questionId,
      payload.answer,
      payload.userId,
    );

    return true;
  }
}

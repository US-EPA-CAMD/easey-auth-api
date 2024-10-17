import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@us-epa-camd/easey-common/logger';
import { createClientAsync } from 'soap';
import { SignAuthResponseDTO } from '../dtos/sign-auth-response.dto';
import { SendPhonePinParamDTO } from '../dtos/send-phone-pin-param.dto';
import { EaseyException } from '@us-epa-camd/easey-common/exceptions';
import { CurrentUser } from '@us-epa-camd/easey-common/interfaces';
import { getConfigValue } from '@us-epa-camd/easey-common/utilities';
import { UserSessionService } from '../user-session/user-session.service';
import { TokenService } from '../token/token.service';
import { OidcHelperService } from '../oidc/OidcHelperService';
import {
  CredentialsSignDTO,
  SignatureRequest,
} from '../dtos/certification-sign-param.dto';
import { BypassService } from '../oidc/Bypass.service';
import { PolicyResponse } from '../dtos/policy-response';
import { EntityManager } from 'typeorm';
import { SignValidateResponseDTO } from '../dtos/sign-validate-response.dto';
import { SignValidateParamDTO } from '../dtos/sign-validate-param.dto';

import { MonitorPlan } from '../entities/monitor-plan.entity';
import { Plant } from '../entities/plant.entity';
import { QaCertEvent } from '../entities/qa-cert-event.entity';
import { QaSuppData } from '../entities/qa-supp.entity';
import { QaTee } from '../entities/qa-tee.entity';
import { ReportingPeriod } from '../entities/reporting-period.entity';
import { CheckSession } from '../entities/check-session.entity';
import { TestSummary } from '../entities/test-summary.entity';
import { EmissionEvaluation } from '../entities/emission-evaluation.entity';
import { PermissionsService } from '../permissions/Permissions.service';

@Injectable()
export class SignService {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly userSessionService: UserSessionService,
    private readonly tokenService: TokenService,
    private readonly bypassService: BypassService,
    private readonly oidcHelperService: OidcHelperService,
    private readonly permissionsService: PermissionsService,
  ) {}

  returnManager() {
    return this.entityManager;
  }

  async signAllFiles(
    activityId: string,
    fileArray: Express.Multer.File[],
  ): Promise<void> {
    //If bypass is enabled, skip the call to sign
    if (this.bypassService.bypassEnabled()) {
      return;
    }

    const signFilesIndividually = this.configService.get<boolean>('app.signFilesIndividually');
    const apiToken = await this.tokenService.getCdxApiToken();
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = signFilesIndividually
      ? `${registerApiUrl}/api/v1/cromerr/sign`
      : `${registerApiUrl}/api/v1/cromerr/signMultiple`;

    try {
      const signatureRequest = new SignatureRequest();
      signatureRequest.activityId = activityId;

      let signAuthResponseDTO : SignAuthResponseDTO;
      if (signFilesIndividually) {

        for (const file of fileArray) {
          // Add your processing logic here
          signAuthResponseDTO = await this.oidcHelperService.signSingleFile<
            SignAuthResponseDTO
          >(apiUrl, apiToken, file, signatureRequest);
        }

      } else {
        signAuthResponseDTO = await this.oidcHelperService.signMultipleFiles<
          SignAuthResponseDTO
        >(apiUrl, apiToken, fileArray, signatureRequest);
      }

      if (!signAuthResponseDTO) {
        throw new Error(`Unable to sign document with activity id ${activityId}`,);
      }
    } catch (error) {
      this.logger.error(
        `Unable to sign document with activity id ${activityId}`,
        error,
      );
      throw new EaseyException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //this endpoint is to pre-validate all the MP, QAT, QCE, TEE, EM files that need to be submitted
  async validate(
    params: SignValidateParamDTO,
  ): Promise<SignValidateResponseDTO> {

    const result = new SignValidateResponseDTO();
    result.hasValidationError = false;

    const userId = params.userId;
    const items = params.items;

    const session = await this.userSessionService.findSessionByUserId(userId);

    //Retrieve the latest facility permissions with missing cert statements flag
    const permissionsWithCertStatementsFlag = await this.permissionsService.retrieveAllUserFacilities(userId, JSON.parse(session.roles), session.securityToken, session.clientIp);

    const missingCertificationStatements = permissionsWithCertStatementsFlag.missingCertificationStatements;
    if (missingCertificationStatements) {
      result.hasValidationError = true;
      result.validationErrorHeading = "Unsigned Certification Statements Error"
      result.validationErrorMessage = "You have not signed all of the necessary certification statements which are associated with your responsibilities as a representative or agent. Until these certification statements have been signed, you will not be able to submit data via ECMPS. Please use the CAMD Business System to sign all of your required certification statements."
      return result;
    }

    // retrieve the latest facilities permission list
    const facilitiesWithPermissions = permissionsWithCertStatementsFlag.plantList;
    
    //initialize failed file name list for user permission and submission criteria validate
    const failedUserPermissionFileNameList = {
      MP: [],
      QAT: [],
      QCE: [],
      TEE: [],
      EM: [],
    }
    
    const failedSubmissionCriteriaFileNameList = {
      MP: [],
      QAT: [],
      QCE: [],
      TEE: [],
      EM: [],
    }

    //check each of the item that need to be validated
    for (const item of items) {

      const locations = await this.returnManager().query(
        `SELECT camdecmpswks.get_mp_location_list($1);`,
        [item.monPlanId],
      );
      const mp_location_list = locations[0]['get_mp_location_list'];

      //get monitor plan record from monitor_plan table
      const mp: MonitorPlan = await this.returnManager().findOneBy(
        MonitorPlan,
        { monPlanIdentifier: item.monPlanId },
      );

      //get corresponding plant record
      const facility: Plant = await this.returnManager().findOneBy(
        Plant, 
        { facIdentifier: mp.facIdentifier,}
      );

      //get corresponding user permissions by facility id
      const matchedRoles = facilitiesWithPermissions.find(f => f.facId === mp.facIdentifier)?.permissions;

      // Monitoring Plan related user permissions and file submission criteria validation
      if (item.submitMonPlan === true) {

        //build the fileName;
        const monitorPlanFileName = `${facility.facilityName}_${mp_location_list}`;

        //check if user have the permission to submit MP data
        if (!matchedRoles?.includes('DSMP')) {  
          failedUserPermissionFileNameList.MP.push(monitorPlanFileName);
        }

        const cs: CheckSession = await this.returnManager()
          .createQueryBuilder(CheckSession, 'cs')
          .where('cs.monPlanId = :monPlanId', { monPlanId: item.monPlanId })
          .andWhere('cs.processCode = :processCode', { processCode: 'MP' })
          .andWhere('cs.tesSumId IS NULL')
          .andWhere('cs.qaCertEventId IS NULL')
          .andWhere('cs.testExtensionExemptionId IS NULL')
          .andWhere('cs.rptPeriodId IS NULL')
          .getOne();

        // go through file submission criteria for MP data
        if ((mp.submissionAvailabilityCode !== 'REQUIRE' && mp.updatedStatusFLG !== 'Y')|| (mp.needsEvalFLG !== 'N') || ( cs.severityCode == null || cs.severityCode === "FATAL")) {
          // push the failed file name to the list
          failedSubmissionCriteriaFileNameList.MP.push(monitorPlanFileName);
        }
      }

      // QA Test Data related user permissions and file submission criteria validation
      for (const id of item.testSumIds) {
        const ts: QaSuppData = await this.returnManager().findOneBy(
          QaSuppData,
          {
            testSumId: id,
          },
        );

        const summary = await this.returnManager().findOneBy(
          TestSummary,
          {
            testSumIdentifier: id,
          },
        );

        const location = summary.monLOCIdentifier;
        const testNumber = summary.testNumber;
        const testType = summary.testTypeCode;

        const qatFileName = `${facility.facilityName}_${location}_${testNumber}_${testType}`

        if (!matchedRoles?.includes('DSQA')) {
          failedUserPermissionFileNameList.QAT.push(qatFileName);
        }

        const cs: CheckSession = await this.returnManager().findOneBy(
          CheckSession,
          {
            tesSumId: id,
          },
        );

        if ( (!(ts == null && summary.updatedStatusFLG === "Y") && ts.submissionAvailabilityCode !== "REQUIRE" && !(ts.submissionAvailabilityCode === "GRANTED" && summary.updatedStatusFLG === "Y")) || (summary.needsEvalFLG !== "N") || (cs.severityCode == null || cs.severityCode === "FATAL")) {
          failedSubmissionCriteriaFileNameList.QAT.push(qatFileName);
        }
      }

      // QA Certfication Events related user permissions and file submission criteria validation
      for (const id of item.qceIds) {
        const qce: QaCertEvent = await this.returnManager().findOneBy(
          QaCertEvent,
          { qaCertEventIdentifier: id },
        );

        const location = qce.monLOCIdentifier;
        const systemIdentifier = qce.monSystemIdentifier;
        const componentIdentifier = qce.componentIdentifier;
        const certEventCode = qce.qaCertEventCode;
        const certEventDate = qce.qaCertEventDate; 

        const qceFileName = `${facility.facilityName}_${location}_${systemIdentifier}_${componentIdentifier}_${certEventCode}_${certEventDate}`

        if (!matchedRoles?.includes('DSQA')) {
          failedUserPermissionFileNameList.QCE.push(qceFileName);
        }

        const cs: CheckSession = await this.returnManager().findOneBy(
          CheckSession,
          {
            qaCertEventId: id,
          },
        );

        if ( (qce.submissionAvailabilityCode !== "REQUIRE" && qce.updatedStatusFLG !== "Y") || qce.needsEvalFLG !== "N" || ( cs.severityCode == null || cs.severityCode === "FATAL" ) ) {
          failedSubmissionCriteriaFileNameList.QCE.push(qceFileName);
        }
      }

      // QA Test Extension Exemptions Data related user permissions and file submission criteria validation
      for (const id of item.teeIds) {
        const tee: QaTee = await this.returnManager().findOneBy(QaTee, {
          testExtensionExemptionIdentifier: id,
        });

        const rpt: ReportingPeriod = await this.returnManager().findOneBy(ReportingPeriod, {
          rptPeriodIdentifier: tee.rptPeriodIdentifier,
        });

        const location = tee.monLOCIdentifier;
        const systemIdentifier = tee.monSystemIdentifier;
        const componentIdentifier = tee.componentIdentifier;
        const extensExemptCode = tee.extensExemptCode;
        const year = rpt.calendarYear;
        const quarter = rpt.quarter;

        const teeFileName = `${facility.facilityName}_${location}_${systemIdentifier}_${componentIdentifier}_${extensExemptCode}_${year}_${quarter}`

        if (!matchedRoles?.includes('DSQA')) {
          failedUserPermissionFileNameList.TEE.push(teeFileName);
        }

        const cs: CheckSession = await this.returnManager().findOneBy(
          CheckSession,
          {
            testExtensionExemptionId: id,
          },
        );

        if ( (tee.submissionAvailabilityCode !== "REQUIRE" && tee.updatedStatusFLG !== "Y") || tee.needsEvalFLG !== "N" || (cs.severityCode == null || cs.severityCode === "FATAL") ) {
          failedSubmissionCriteriaFileNameList.TEE.push(teeFileName);
        }

      }


      for (const periodAbr of item.emissionsReportingPeriods) {
        const rp: ReportingPeriod = await this.returnManager().findOneBy(ReportingPeriod, {
          periodAbbreviation: periodAbr,
        });

        const location = mp_location_list;
        const year = rp.calendarYear;
        const quarter = rp.quarter;

        const emFileName = `${facility.facilityName}_${location}_${year}_${quarter}`

        if (!matchedRoles?.includes('DSEM')) {
          failedUserPermissionFileNameList.EM.push(emFileName);
        }

        const ee: EmissionEvaluation = await this.returnManager().findOneBy(
          EmissionEvaluation,
          {
            monPlanIdentifier: item.monPlanId,
            rptPeriodIdentifier: rp.rptPeriodIdentifier,
          },
        );

        const cs: CheckSession = await this.returnManager().findOneBy(
          CheckSession,
          {
            monPlanId: item.monPlanId,
            rptPeriodId: rp.rptPeriodIdentifier,
          },
        );

        if ( ( ee.submissionAvailabilityCode !== "REQUIRE" && ( ee.submissionAvailabilityCode !== "GRANTED" || ee.updatedStatusFLG !== "Y" )) || ee.needsEvalFLG !== "N" || (cs.severityCode == null || cs.severityCode === "FATAL")) {
          failedSubmissionCriteriaFileNameList.EM.push(emFileName);
        }
      }
    }

    // check user permissions validation results
    if (failedUserPermissionFileNameList.MP.length > 0 ||
      failedUserPermissionFileNameList.QAT.length > 0 ||
      failedUserPermissionFileNameList.QCE.length > 0 ||
      failedUserPermissionFileNameList.TEE.length > 0 ||
      failedUserPermissionFileNameList.EM.length > 0
     ) {

      result.hasValidationError = true;
      result.validationErrorHeading = "User Permission Error";
      const failedMPFileNames = failedUserPermissionFileNameList.MP.length > 0 ? ` Monitor Plan: ${failedUserPermissionFileNameList.MP}`:'';
      const failedQATFileNames = failedUserPermissionFileNameList.QAT.length > 0 ? ` QA Test Data: ${failedUserPermissionFileNameList.QAT}`:'';
      const failedQCEFileNames = failedUserPermissionFileNameList.QCE.length > 0 ? ` QA Cert Events: ${failedUserPermissionFileNameList.QCE}`:'';
      const failedTEEFileNames = failedUserPermissionFileNameList.TEE.length > 0 ? ` Test Extension Exemptions Data: ${failedUserPermissionFileNameList.TEE}`:'';
      const failedEMFileNames = failedUserPermissionFileNameList.EM.length > 0 ? ` Emissions: ${failedUserPermissionFileNameList.EM}`:'';

      result.validationErrorMessage = `You are no longer permitted to submit the following files:${failedMPFileNames}${failedQATFileNames}${failedQCEFileNames}${failedTEEFileNames}${failedEMFileNames}. Please use the CAMD Business System to verify your representative or agent responsibilities.`;
      return result;
    }

    // check file submission criteria validation results
    if (failedSubmissionCriteriaFileNameList.MP.length > 0 ||
      failedSubmissionCriteriaFileNameList.QAT.length > 0 ||
      failedSubmissionCriteriaFileNameList.QCE.length > 0 ||
      failedSubmissionCriteriaFileNameList.TEE.length > 0 ||
      failedSubmissionCriteriaFileNameList.EM.length > 0
    ) {

      result.hasValidationError = true;
      result.validationErrorHeading = "File Submission Criteria Error";
      const failedMPFileNames = failedSubmissionCriteriaFileNameList.MP.length > 0 ? ` Monitor Plan: ${failedSubmissionCriteriaFileNameList.MP}`:'';
      const failedQATFileNames = failedSubmissionCriteriaFileNameList.QAT.length > 0 ? ` QA Test Data: ${failedSubmissionCriteriaFileNameList.QAT}`:'';
      const failedQCEFileNames = failedSubmissionCriteriaFileNameList.QCE.length > 0 ? ` QA Cert Events: ${failedSubmissionCriteriaFileNameList.QCE}`:'';
      const failedTEEFileNames = failedSubmissionCriteriaFileNameList.TEE.length > 0 ? ` Test Extension Exemptions Data: ${failedSubmissionCriteriaFileNameList.TEE}`:'';
      const failedEMFileNames = failedSubmissionCriteriaFileNameList.EM.length > 0 ? ` Emissions: ${failedSubmissionCriteriaFileNameList.EM}`:'';

      result.validationErrorMessage = `Files in the submission set do not meet the criteria for submission. The problem files include:${failedMPFileNames}${failedQATFileNames}${failedQCEFileNames}${failedTEEFileNames}${failedEMFileNames}.`;
      return result;
    }

    return result;
  }

  async createCromerrActivity(
    user: CurrentUser,
    credentials: CredentialsSignDTO,
    idToken?: string,
  ): Promise<SignAuthResponseDTO> {
    //If bypass is enabled, return as a dummy activity as we do not have a valid ID token
    if (this.bypassService.bypassEnabled()) {
      const signAuthResponseDTO = new SignAuthResponseDTO();
      signAuthResponseDTO.activityId = '1';
      return signAuthResponseDTO;
    }

    //If an idToken is not passed in, assume ECMPS and try to get the token from the session
    if (!idToken) {
      const userId = user?.userId ?? '';
      const userSession = await this.userSessionService.findSessionByUserId(
        userId,
      );
      if (!userSession) {
        throw new EaseyException(
          new Error(
            'Unable to create activity. No valid id-token found for the user.',
          ),
          HttpStatus.BAD_REQUEST,
        );
      }
      idToken = userSession.idToken;
    }

    //create the activity
    const apiToken = await this.tokenService.getCdxApiToken();
    return await this.sendToCromerr(apiToken, credentials, idToken);
  }

  async sendToCromerr(
    apiToken: string,
    credentials: CredentialsSignDTO,
    idToken: string,
  ): Promise<SignAuthResponseDTO> {
    const dataflowName = this.configService.get<string>('app.dataFlow' ) ;
    const requestBody = {
      user: {
        userId: credentials.userId,
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        middleInitial: credentials.middleInitial,
      },
      dataflow: dataflowName,
      activityDescription: credentials.activityDescription,
    };

    const customHeaders = {
      'Id-Token': idToken,
    };
    const registerApiUrl = getConfigValue('OIDC_REST_API_BASE', '');
    const apiUrl = `${registerApiUrl}/api/v1/cromerr/createActivity`;

    try {
      const signAuthResponseDTO = await this.oidcHelperService.makePostRequestJson<
        SignAuthResponseDTO
      >(apiUrl, requestBody, apiToken, customHeaders);
      if (!signAuthResponseDTO) {
        throw new Error(
          `Unable to create a CROMERR activity for user ${credentials.userId}`,
        );
      }

      return signAuthResponseDTO;
    } catch (error) {
      this.logger.error(
        `Unable to create a CROMERR activity for user ${credentials.userId}`,
        error,
      );
      throw new Error(
        `Unable to create a CROMERR activity for user ${credentials.userId}.  ${error.message}`,
      );
    }
  }
}

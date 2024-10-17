import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

import { NumericColumnTransformer } from '@us-epa-camd/easey-common/transforms';

@Entity({ name: 'camdecmpswks.emission_evaluation' })
export class EmissionEvaluation extends BaseEntity {
  @PrimaryColumn({ name: 'mon_plan_id' })
  monPlanIdentifier: string;

  @PrimaryColumn({
    name: 'rpt_period_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  rptPeriodIdentifier: number;

  @Column({ name: 'last_updated' })
  lastUpdated: string;

  @Column({ name: 'updated_status_flg' })
  updatedStatusFLG: string;

  @Column({ name: 'needs_eval_flg' })
  needsEvalFLG: string;

  @Column({ name: 'chk_session_id' })
  chkSessionIdentifier: string;

  @Column({
    name: 'submission_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  submissionIdentifier: number;

  @Column({ name: 'submission_availability_cd' })
  submissionAvailabilityCode: string;

  @Column({ name: 'pending_status_cd' })
  pendingStatusCode: string;

  @Column({ name: 'eval_status_cd' })
  evalStatusCode: string;
}

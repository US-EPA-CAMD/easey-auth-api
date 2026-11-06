import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

import { NumericColumnTransformer } from '@us-epa-camd/easey-common/transforms';

@Entity({ name: 'camdecmpswks.test_extension_exemption' })
export class QaTee extends BaseEntity {
  @PrimaryColumn({ name: 'test_extension_exemption_id' })
  testExtensionExemptionIdentifier: string;

  @Column({ name: 'mon_loc_id' })
  monLOCIdentifier: string;

  @Column({
    name: 'rpt_period_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  rptPeriodIdentifier: number;

  @Column({ name: 'mon_sys_id' })
  monSystemIdentifier: string;

  @Column({ name: 'component_id' })
  componentIdentifier: string;

  @Column({ name: 'fuel_cd' })
  fuelCode: string;

  @Column({ name: 'extens_exempt_cd' })
  extensExemptCode: string;

  @Column({ name: 'last_updated' })
  lastUpdated: string;

  @Column({ name: 'updated_status_flg' })
  updatedStatusFLG: string;

  @Column({ name: 'needs_eval_flg' })
  needsEvalFLG: string;

  @Column({ name: 'chk_session_id' })
  chkSessionIdentifier: string;

  @Column({
    name: 'hours_used',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  hoursUsed: number;

  @Column({ name: 'userid' })
  userid: string;

  @Column({ name: 'add_date' })
  addDate: string;

  @Column({ name: 'update_date' })
  updateDate: string;

  @Column({ name: 'span_scale_cd' })
  spanScaleCode: string;

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

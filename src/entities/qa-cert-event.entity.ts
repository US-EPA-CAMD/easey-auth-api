import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

import { NumericColumnTransformer } from '@us-epa-camd/easey-common/transforms';

@Entity({ name: 'camdecmpswks.qa_cert_event' })
export class QaCertEvent extends BaseEntity {
  @PrimaryColumn({ name: 'qa_cert_event_id' })
  qaCertEventIdentifier: string;

  @Column({ name: 'mon_loc_id' })
  monLOCIdentifier: string;

  @Column({ name: 'mon_sys_id' })
  monSystemIdentifier: string;

  @Column({ name: 'component_id' })
  componentIdentifier: string;

  @Column({ name: 'qa_cert_event_cd' })
  qaCertEventCode: string;

  @Column({ name: 'qa_cert_event_date' })
  qaCertEventDate: string;

  @Column({
    name: 'qa_cert_event_hour',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  qaCertEventHour: number;

  @Column({ name: 'required_test_cd' })
  requiredTestCode: string;

  @Column({ name: 'conditional_data_begin_date' })
  conditionalDataBeginDate: string;

  @Column({
    name: 'conditional_data_begin_hour',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  conditionalDataBeginHour: number;

  @Column({ name: 'last_test_completed_date' })
  lastTestCompletedDate: string;

  @Column({
    name: 'last_test_completed_hour',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  lastTestCompletedHour: number;

  @Column({ name: 'last_updated' })
  lastUpdated: string;

  @Column({ name: 'updated_status_flg' })
  updatedStatusFLG: string;

  @Column({ name: 'needs_eval_flg' })
  needsEvalFLG: string;

  @Column({ name: 'chk_session_id' })
  chkSessionIdentifier: string;

  @Column({ name: 'userid' })
  userid: string;

  @Column({ name: 'add_date' })
  addDate: string;

  @Column({ name: 'update_date' })
  updateDate: string;

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

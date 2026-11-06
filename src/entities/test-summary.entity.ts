import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

import { NumericColumnTransformer } from '@us-epa-camd/easey-common/transforms';

@Entity({ name: 'camdecmpswks.test_summary' })
export class TestSummary extends BaseEntity {
  @PrimaryColumn({ name: 'test_sum_id' })
  testSumIdentifier: string;

  @Column({ name: 'mon_loc_id' })
  monLOCIdentifier: string;

  @Column({ name: 'mon_sys_id' })
  monSystemIdentifier: string;

  @Column({ name: 'component_id' })
  componentIdentifier: string;

  @Column({ name: 'test_num' })
  testNumber: string;

  @Column({
    name: 'gp_ind',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  gpIndicator: number;

  @Column({
    name: 'calc_gp_ind',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  calcGPIndicator: number;

  @Column({ name: 'test_type_cd' })
  testTypeCode: string;

  @Column({ name: 'test_reason_cd' })
  testReasonCode: string;

  @Column({ name: 'test_result_cd' })
  testResultCode: string;

  @Column({ name: 'calc_test_result_cd' })
  calcTestResultCode: string;

  @Column({
    name: 'rpt_period_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  rptPeriodIdentifier: number;

  @Column({ name: 'test_description' })
  testDescription: string;

  @Column({ name: 'begin_date' })
  beginDate: string;

  @Column({
    name: 'begin_hour',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  beginHour: number;

  @Column({
    name: 'begin_min',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  beginMIN: number;

  @Column({ name: 'end_date' })
  endDate: string;

  @Column({
    name: 'end_hour',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  endHour: number;

  @Column({
    name: 'end_min',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  endMIN: number;

  @Column({
    name: 'calc_span_value',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  calcSpanValue: number;

  @Column({ name: 'test_comment' })
  testComment: string;

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

  @Column({ name: 'span_scale_cd' })
  spanScaleCode: string;

  @Column({ name: 'injection_protocol_cd' })
  injectionProtocolCode: string;

  @Column({ name: 'eval_status_cd' })
  evalStatusCode: string;
}

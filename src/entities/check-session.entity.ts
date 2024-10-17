import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'camdecmpswks.check_session' })
export class CheckSession extends BaseEntity {
  @PrimaryColumn({ name: 'chk_session_id' })
  id: string;

  @Column({ name: 'mon_plan_id' })
  monPlanId: string;

  @Column({ name: 'test_sum_id' })
  tesSumId: string;

  @Column({ name: 'qa_cert_event_id' })
  qaCertEventId: string;

  @Column({ name: 'test_extension_exemption_id' })
  testExtensionExemptionId: string;

  @Column({ name: 'rpt_period_id' })
  rptPeriodId: number;

  @Column({ name: 'severity_cd' })
  severityCode: string;

  @Column({ name: 'process_cd' })
  processCode: string;
}

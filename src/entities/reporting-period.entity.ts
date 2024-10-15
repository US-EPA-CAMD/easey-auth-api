import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

import { NumericColumnTransformer } from '@us-epa-camd/easey-common/transforms';

@Entity({ name: 'camdecmpsmd.reporting_period' })
export class ReportingPeriod extends BaseEntity {
  @PrimaryColumn({
    name: 'rpt_period_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  rptPeriodIdentifier: number;

  @Column({
    name: 'calendar_year',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  calendarYear: number;

  @Column({
    name: 'quarter',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  quarter: number;

  @Column({ name: 'begin_date' })
  beginDate: string;

  @Column({ name: 'end_date' })
  endDate: string;

  @Column({ name: 'period_description' })
  periodDescription: string;

  @Column({ name: 'period_abbreviation' })
  periodAbbreviation: string;

  @Column({
    name: 'archive_ind',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  archiveIndicator: number;
}

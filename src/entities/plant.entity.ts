import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { NumericColumnTransformer } from '@us-epa-camd/easey-common/transforms';
import { Unit } from './unit.entity';
import { StackPipe } from './stack-pipe.entity';
import { MonitorPlan } from './monitor-plan.entity';

@Entity({ name: 'camd.plant' })
export class Plant extends BaseEntity {
  @PrimaryColumn({
    name: 'fac_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  facIdentifier: number;

  @Column({
    name: 'oris_code',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  orisCode: number;

  @Column({ name: 'facility_name' })
  facilityName: string;

  @Column({ name: 'description' })
  description: string;

  @Column({ name: 'state' })
  state: string;

  @Column({ name: 'county_cd' })
  countyCode: string;

  @Column({
    name: 'sic_code',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  sicCode: number;

  @Column({
    name: 'epa_region',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  epaRegion: number;

  @Column({ name: 'nerc_region' })
  nercRegion: string;

  @Column({ name: 'airsid' })
  airsid: string;

  @Column({ name: 'findsid' })
  findsid: string;

  @Column({ name: 'stateid' })
  stateid: string;

  @Column({
    name: 'latitude',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  latitude: number;

  @Column({
    name: 'longitude',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  longitude: number;

  @Column({ name: 'frs_id' })
  frsIdentifier: string;

  @Column({
    name: 'payee_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  payeeIdentifier: number;

  @Column({ name: 'permit_exp_date' })
  permitEXPDate: string;

  @Column({ name: 'latlon_source' })
  latlonSource: string;

  @Column({ name: 'tribal_land_cd' })
  tribalLandCode: string;

  @Column({
    name: 'first_ecmps_rpt_period_id',
    type: 'numeric',
    transformer: new NumericColumnTransformer(),
  })
  firstEcmpsRPTPeriodIdentifier: number;

  @Column({ name: 'userid' })
  userid: string;

  @Column({ name: 'add_date' })
  addDate: string;

  @Column({ name: 'update_date' })
  updateDate: string;

  @OneToMany(() => Unit, (unit) => unit.plant)
  units: Unit[];

  @OneToMany(() => StackPipe, (stackPipe) => stackPipe.plant)
  stackPipes: StackPipe[];

  @OneToMany(() => MonitorPlan, (plan) => plan.plant)
  monitorPlans: MonitorPlan[];
}

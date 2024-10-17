import {
    BaseEntity,
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    JoinColumn,
    OneToOne,
  } from 'typeorm';
  
  import { NumericColumnTransformer } from '@us-epa-camd/easey-common/transforms';
  
  import { Plant } from './plant.entity';
  import { MonitorLocation } from './monitor-location.entity';
  
  @Entity({ name: 'camd.unit' })
  export class Unit extends BaseEntity {
    @PrimaryColumn({
      name: 'unit_id',
      transformer: new NumericColumnTransformer(),
    })
    id: number;
  
    @Column({
      name: 'unitid',
    })
    name: string;
  
    @Column({
      name: 'fac_id',
    })
    facId: number;
  
    @ManyToOne(() => Plant, (o) => o.units, { eager: true })
    @JoinColumn({ name: 'fac_id' })
    plant: Plant;
  
    @OneToOne(() => MonitorLocation, (o) => o.unit)
    @JoinColumn({ name: 'unit_id' })
    location: MonitorLocation;
  }
  
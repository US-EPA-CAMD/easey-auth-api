import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'camdecmpswks.user_check_out' })
export class UserCheckOut extends BaseEntity {
  @Column({ name: 'facility_id' })
  facilityIdentifier: number;

  @PrimaryColumn({ name: 'mon_plan_id' })
  monPlanIdentifier: string;

  @Column({ name: 'checked_out_on' })
  checkedOutOn: string;

  @Column({ name: 'checked_out_by' })
  checkedOutBy: string;

  @Column({ name: 'last_activity' })
  lastActivity: string;
}

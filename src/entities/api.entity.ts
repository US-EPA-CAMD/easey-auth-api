import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'camdaux.api' })
export class Api extends BaseEntity {
  @PrimaryColumn({ name: 'api_id' })
  id: number;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'client_id' })
  clientId?: string;

  @Column({ name: 'client_secret' })
  clientSecret?: string;

  @Column({ name: 'pass_code' })
  passCode?: string;

  @Column({ name: 'encryption_key' })
  encryptionKey?: string;
}

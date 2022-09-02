import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'camdaux.client_config' })
export class ClientConfig extends BaseEntity {
  @PrimaryColumn({ name: 'client_id' })
  id: string;

  @Column({ name: 'client_name' })
  name: string;

  @Column({ name: 'client_secret' })
  clientSecret: string;

  @Column({ name: 'client_passcode' })
  passCode: string;

  @Column({ name: 'encryption_key' })
  encryptionKey: string;
}

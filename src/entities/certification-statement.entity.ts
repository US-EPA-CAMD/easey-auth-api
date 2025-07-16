import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
//
@Entity({ name: 'camdecmpsmd.certification_statement' })
export class CertificationStatement extends BaseEntity {
  @PrimaryColumn({ name: 'statement_id' })
  statementId: number;

  @Column({ name: 'prg_cd' })
  prgCode: string;

  @Column({ name: 'statement_location' })
  statementLocation: string;

  @Column({ name: 'display_order' })
  displayOrder: number;
}

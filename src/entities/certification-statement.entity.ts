import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';
//
@Entity({ name: 'camdecmpswks.certification_statement' })
export class CertificationStatement extends BaseEntity {
  @PrimaryColumn({ name: 'statement_id' })
  statementId: number;

  @Column({ name: 'statement_text' })
  statementText: string;

  @Column({ name: 'prg_cd' })
  prgCode: string;

  @Column({ name: 'display_order' })
  displayOrder: number;
}

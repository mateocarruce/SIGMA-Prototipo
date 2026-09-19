import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';

@Entity('catalogo_tarifas')
export class CatalogoTarifa {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', name: 'codigo_tpsns', unique: true })
  codigoTpsns: string;

  @Column({ type: 'text' })
  descripcion: string;

  // NUMERIC(14,4): amplio a propósito — el catálogo real incluye insumos/medicamentos
  // con costos unitarios de hasta 4 decimales (ej. 0.0138) que en 2 decimales perderían
  // precisión significativa. Ver sql/07-alter-catalogo-tarifas.sql.
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'valor_oficial',
    transformer: numericTransformer,
  })
  valorOficial: number;

  @Column({ type: 'text', name: 'tipo_procedimiento', nullable: true })
  tipoProcedimiento: string | null;

  @Column({ type: 'text', nullable: true })
  nivel: string | null;

  @Column({ type: 'timestamptz', name: 'actualizado_en' })
  actualizadoEn: Date;
}

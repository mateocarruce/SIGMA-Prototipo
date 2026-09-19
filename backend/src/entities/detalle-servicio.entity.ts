import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Planilla } from './planilla.entity';
import { numericTransformer } from '../common/numeric.transformer';

export type EstadoFila = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

@Entity('detalles_servicios')
export class DetalleServicio {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'planilla_id' })
  planillaId: string;

  @ManyToOne(() => Planilla)
  @JoinColumn({ name: 'planilla_id' })
  planilla: Planilla;

  @Column({ type: 'text', name: 'codigo_tpsns' })
  codigoTpsns: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'text', name: 'beneficiario_nombre' })
  beneficiarioNombre: string;

  @Column({ type: 'text', name: 'beneficiario_identificacion' })
  beneficiarioIdentificacion: string;

  @Column({ type: 'date', name: 'fecha_servicio' })
  fechaServicio: string;

  // NUMERIC (no INT): datos reales incluyen cantidades fraccionarias, por
  // ejemplo dosis parciales de medicamentos líquidos (1.43, 0.715 unidades).
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 4,
    transformer: numericTransformer,
  })
  cantidad: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'valor_unitario_solicitado',
    transformer: numericTransformer,
  })
  valorUnitarioSolicitado: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'subtotal_solicitado',
    transformer: numericTransformer,
  })
  subtotalSolicitado: number;

  @Column({ type: 'text', name: 'estado_fila', default: 'PENDIENTE' })
  estadoFila: EstadoFila;

  @Column({ type: 'text', name: 'nivel_riesgo', nullable: true })
  nivelRiesgo: NivelRiesgo | null;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'score_riesgo',
    nullable: true,
    transformer: numericTransformer,
  })
  scoreRiesgo: number | null;

  @Column({ type: 'jsonb', name: 'shap_factores', nullable: true })
  shapFactores: Array<{ feature: string; pct: number }> | null;
}

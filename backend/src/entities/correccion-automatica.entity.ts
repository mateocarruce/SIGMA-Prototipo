import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DetalleServicio } from './detalle-servicio.entity';
import { numericTransformer } from '../common/numeric.transformer';

@Entity('correcciones_automaticas')
export class CorreccionAutomatica {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'detalle_servicio_id' })
  detalleServicioId: string;

  @ManyToOne(() => DetalleServicio)
  @JoinColumn({ name: 'detalle_servicio_id' })
  detalleServicio: DetalleServicio;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'valor_anterior',
    transformer: numericTransformer,
  })
  valorAnterior: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'valor_corregido',
    transformer: numericTransformer,
  })
  valorCorregido: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'subtotal_anterior',
    transformer: numericTransformer,
  })
  subtotalAnterior: number;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 4,
    name: 'subtotal_corregido',
    transformer: numericTransformer,
  })
  subtotalCorregido: number;

  @Column({
    type: 'numeric',
    precision: 5,
    scale: 2,
    name: 'score_riesgo',
    transformer: numericTransformer,
  })
  scoreRiesgo: number;

  @Column({ type: 'text', name: 'nivel_riesgo' })
  nivelRiesgo: string;

  @Column({ type: 'text' })
  motivo: string;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Proveedor } from './proveedor.entity';
import { Usuario } from './usuario.entity';

export type EstadoPlanilla =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA';

@Entity('planillas')
export class Planilla {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  codigo: string;

  @Column({ type: 'uuid', name: 'proveedor_id' })
  proveedorId: string;

  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ type: 'text', name: 'tipo_servicio' })
  tipoServicio: string;

  @Column({ type: 'text', name: 'mes_ano_prestacion' })
  mesAnoPrestacion: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'fecha_carga' })
  fechaCarga: Date;

  @Column({ type: 'text', default: 'PENDIENTE' })
  estado: EstadoPlanilla;

  @Column({ type: 'boolean', name: 'evaluada_ia', default: false })
  evaluadaIa: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creador: Usuario | null;
}

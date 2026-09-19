import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorreccionAutomatica } from '../entities/correccion-automatica.entity';

@Injectable()
export class CorreccionesService {
  constructor(
    @InjectRepository(CorreccionAutomatica)
    private readonly correccionesRepo: Repository<CorreccionAutomatica>,
  ) {}

  async findAll(q?: string) {
    const qb = this.correccionesRepo
      .createQueryBuilder('correccion')
      .leftJoinAndSelect('correccion.detalleServicio', 'detalle')
      .leftJoinAndSelect('detalle.planilla', 'planilla')
      .leftJoinAndSelect('planilla.proveedor', 'proveedor')
      .orderBy('correccion.fecha', 'DESC');

    if (q && q.trim()) {
      qb.where(
        '(detalle.beneficiario_nombre ILIKE :q OR detalle.beneficiario_identificacion ILIKE :q OR detalle.codigo_tpsns ILIKE :q OR planilla.codigo ILIKE :q)',
        { q: `%${q.trim()}%` },
      );
    }

    const correcciones = await qb.getMany();

    return correcciones.map((c) => ({
      id: c.id,
      detalleServicioId: c.detalleServicioId,
      valorAnterior: c.valorAnterior,
      valorCorregido: c.valorCorregido,
      subtotalAnterior: c.subtotalAnterior,
      subtotalCorregido: c.subtotalCorregido,
      scoreRiesgo: c.scoreRiesgo,
      nivelRiesgo: c.nivelRiesgo,
      motivo: c.motivo,
      fecha: c.fecha,
      detalle: c.detalleServicio
        ? {
            id: c.detalleServicio.id,
            codigoTpsns: c.detalleServicio.codigoTpsns,
            descripcion: c.detalleServicio.descripcion,
            beneficiarioNombre: c.detalleServicio.beneficiarioNombre,
            beneficiarioIdentificacion:
              c.detalleServicio.beneficiarioIdentificacion,
          }
        : null,
      planilla: c.detalleServicio?.planilla
        ? {
            id: c.detalleServicio.planilla.id,
            codigo: c.detalleServicio.planilla.codigo,
            proveedor: c.detalleServicio.planilla.proveedor
              ? {
                  id: c.detalleServicio.planilla.proveedor.id,
                  nombre: c.detalleServicio.planilla.proveedor.nombre,
                }
              : null,
          }
        : null,
    }));
  }
}

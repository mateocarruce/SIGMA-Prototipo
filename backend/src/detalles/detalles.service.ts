import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetalleServicio } from '../entities/detalle-servicio.entity';
import { CorreccionAutomatica } from '../entities/correccion-automatica.entity';
import { Planilla } from '../entities/planilla.entity';

@Injectable()
export class DetallesService {
  constructor(
    @InjectRepository(DetalleServicio)
    private readonly detallesRepo: Repository<DetalleServicio>,
    @InjectRepository(CorreccionAutomatica)
    private readonly correccionesRepo: Repository<CorreccionAutomatica>,
    @InjectRepository(Planilla)
    private readonly planillasRepo: Repository<Planilla>,
  ) {}

  async individual(id: string) {
    const detalle = await this.detallesRepo.findOne({ where: { id } });
    if (!detalle) {
      throw new NotFoundException('Detalle no encontrado');
    }

    const planilla = await this.planillasRepo.findOne({
      where: { id: detalle.planillaId },
      relations: ['proveedor'],
    });

    const correccion = await this.correccionesRepo.findOne({
      where: { detalleServicioId: detalle.id },
      order: { fecha: 'DESC' },
    });

    const valorOriginalSolicitado = correccion
      ? correccion.valorAnterior
      : detalle.valorUnitarioSolicitado;
    const subtotalOriginalSolicitado = correccion
      ? correccion.subtotalAnterior
      : detalle.subtotalSolicitado;

    return {
      id: detalle.id,
      planilla: planilla
        ? {
            id: planilla.id,
            codigo: planilla.codigo,
            proveedor: {
              id: planilla.proveedor.id,
              nombre: planilla.proveedor.nombre,
            },
            tipoServicio: planilla.tipoServicio,
            mesAnoPrestacion: planilla.mesAnoPrestacion,
          }
        : null,
      codigoTpsns: detalle.codigoTpsns,
      descripcion: detalle.descripcion,
      beneficiarioNombre: detalle.beneficiarioNombre,
      beneficiarioIdentificacion: detalle.beneficiarioIdentificacion,
      fechaServicio: detalle.fechaServicio,
      cantidad: detalle.cantidad,
      valorOriginalSolicitado,
      subtotalOriginalSolicitado,
      valorUnitarioActual: detalle.valorUnitarioSolicitado,
      subtotalActual: detalle.subtotalSolicitado,
      estadoFila: detalle.estadoFila,
      nivelRiesgo: detalle.nivelRiesgo,
      scoreRiesgo: detalle.scoreRiesgo,
      shapFactores: detalle.shapFactores,
      fueCorregido: !!correccion,
      correccion: correccion
        ? {
            valorAnterior: correccion.valorAnterior,
            valorCorregido: correccion.valorCorregido,
            subtotalAnterior: correccion.subtotalAnterior,
            subtotalCorregido: correccion.subtotalCorregido,
            motivo: correccion.motivo,
            fecha: correccion.fecha,
          }
        : null,
    };
  }
}

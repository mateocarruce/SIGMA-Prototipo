import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { Planilla } from '../entities/planilla.entity';
import { Proveedor } from '../entities/proveedor.entity';
import { DetalleServicio } from '../entities/detalle-servicio.entity';
import { CatalogoTarifa } from '../entities/catalogo-tarifa.entity';
import { CorreccionAutomatica } from '../entities/correccion-automatica.entity';
import { CreatePlanillaDto } from './dto/create-planilla.dto';

interface FilaImportada {
  fecha: string | Date | number | null;
  codigo_tpsns: string;
  descripcion: string;
  beneficiario_nombre: string;
  beneficiario_identificacion: string;
  cantidad: number;
  valor_unitario: number;
}

interface PredecirRiesgoResponse {
  score: number;
  label: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
  shap_values: Record<string, number>;
}

const CORRECCION_TOLERANCIA = 0.01;

@Injectable()
export class PlanillasService {
  private readonly fastApiUrl: string;

  constructor(
    @InjectRepository(Planilla)
    private readonly planillasRepo: Repository<Planilla>,
    @InjectRepository(Proveedor)
    private readonly proveedoresRepo: Repository<Proveedor>,
    @InjectRepository(DetalleServicio)
    private readonly detallesRepo: Repository<DetalleServicio>,
    @InjectRepository(CatalogoTarifa)
    private readonly catalogoRepo: Repository<CatalogoTarifa>,
    @InjectRepository(CorreccionAutomatica)
    private readonly correccionesRepo: Repository<CorreccionAutomatica>,
    private readonly dataSource: DataSource,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.fastApiUrl =
      this.configService.get<string>('FASTAPI_URL') ??
      'http://127.0.0.1:8000';
  }

  async findAll(estado?: string) {
    const qb = this.planillasRepo
      .createQueryBuilder('planilla')
      .leftJoinAndSelect('planilla.proveedor', 'proveedor')
      .orderBy('planilla.fecha_carga', 'DESC');

    if (estado) {
      qb.where('planilla.estado = :estado', { estado });
    }

    const planillas = await qb.getMany();

    const results = await Promise.all(
      planillas.map(async (planilla) => {
        const { count, total } = await this.detallesRepo
          .createQueryBuilder('detalle')
          .select('COUNT(*)', 'count')
          .addSelect('COALESCE(SUM(detalle.subtotal_solicitado), 0)', 'total')
          .where('detalle.planilla_id = :planillaId', {
            planillaId: planilla.id,
          })
          .getRawOne();

        return {
          id: planilla.id,
          codigo: planilla.codigo,
          proveedor: {
            id: planilla.proveedor.id,
            nombre: planilla.proveedor.nombre,
          },
          tipoServicio: planilla.tipoServicio,
          mesAnoPrestacion: planilla.mesAnoPrestacion,
          fechaCarga: planilla.fechaCarga,
          estado: planilla.estado,
          evaluadaIa: planilla.evaluadaIa,
          totalDetalles: parseInt(count, 10),
          totalSolicitado: parseFloat(total),
        };
      }),
    );

    return results;
  }

  async create(dto: CreatePlanillaDto, userId: string) {
    const proveedor = await this.proveedoresRepo.findOne({
      where: { id: dto.proveedor_id },
    });
    if (!proveedor) {
      throw new BadRequestException('proveedor_id inválido');
    }

    const codigo = await this.generarCodigo();

    const planilla = this.planillasRepo.create({
      codigo,
      proveedorId: proveedor.id,
      tipoServicio: dto.tipo_servicio,
      mesAnoPrestacion: dto.mes_ano_prestacion,
      estado: 'PENDIENTE',
      evaluadaIa: false,
      createdBy: userId,
    });

    const saved = await this.planillasRepo.save(planilla);

    return {
      id: saved.id,
      codigo: saved.codigo,
      proveedor: { id: proveedor.id, nombre: proveedor.nombre },
      tipoServicio: saved.tipoServicio,
      mesAnoPrestacion: saved.mesAnoPrestacion,
      fechaCarga: saved.fechaCarga,
      estado: saved.estado,
      evaluadaIa: saved.evaluadaIa,
    };
  }

  private async generarCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PLA-${year}-`;
    const count = await this.planillasRepo
      .createQueryBuilder('planilla')
      .where('planilla.codigo LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const siguiente = count + 1;
    const codigo = `${prefix}${String(siguiente).padStart(4, '0')}`;

    // Extremely unlikely collision guard (concurrent creates); bump until free.
    const existe = await this.planillasRepo.findOne({ where: { codigo } });
    if (existe) {
      const fallback = `${prefix}${String(siguiente + 1).padStart(4, '0')}`;
      return fallback;
    }
    return codigo;
  }

  async findOne(id: string) {
    const planilla = await this.planillasRepo.findOne({
      where: { id },
      relations: ['proveedor'],
    });
    if (!planilla) {
      throw new NotFoundException('Planilla no encontrada');
    }
    return {
      id: planilla.id,
      codigo: planilla.codigo,
      proveedor: {
        id: planilla.proveedor.id,
        nombre: planilla.proveedor.nombre,
      },
      tipoServicio: planilla.tipoServicio,
      mesAnoPrestacion: planilla.mesAnoPrestacion,
      fechaCarga: planilla.fechaCarga,
      estado: planilla.estado,
      evaluadaIa: planilla.evaluadaIa,
    };
  }

  private async getPlanillaOr404(id: string): Promise<Planilla> {
    const planilla = await this.planillasRepo.findOne({ where: { id } });
    if (!planilla) {
      throw new NotFoundException('Planilla no encontrada');
    }
    return planilla;
  }

  async findDetalles(id: string) {
    await this.getPlanillaOr404(id);
    const detalles = await this.detallesRepo.find({
      where: { planillaId: id },
      order: { fechaServicio: 'ASC' },
    });
    return detalles;
  }

  async cargarArchivo(id: string, file: Express.Multer.File) {
    await this.getPlanillaOr404(id);

    if (!file) {
      throw new BadRequestException('Archivo requerido (campo "archivo")');
    }

    const errores: string[] = [];
    let filasImportadas = 0;

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    } catch (err) {
      throw new BadRequestException(
        'No se pudo leer el archivo. Verifique que sea .xlsx o .xlsm válido',
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El archivo no contiene hojas');
    }
    const sheet = workbook.Sheets[sheetName];
    const rows: FilaImportada[] = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
    });

    const detallesACrear: Partial<DetalleServicio>[] = [];

    rows.forEach((row, index) => {
      const filaNum = index + 2; // +1 header, +1 1-index
      try {
        const codigoTpsns = String(row.codigo_tpsns ?? '').trim();
        const descripcion = String(row.descripcion ?? '').trim();
        const beneficiarioNombre = String(
          row.beneficiario_nombre ?? '',
        ).trim();
        const beneficiarioIdentificacion = String(
          row.beneficiario_identificacion ?? '',
        ).trim();
        const cantidad = Number(row.cantidad);
        const valorUnitario = Number(row.valor_unitario);
        const fechaRaw = row.fecha;

        if (!codigoTpsns || !beneficiarioNombre || !beneficiarioIdentificacion) {
          throw new Error(
            'Faltan campos obligatorios (codigo_tpsns, beneficiario_nombre, beneficiario_identificacion)',
          );
        }
        if (!Number.isFinite(cantidad) || cantidad <= 0) {
          throw new Error('cantidad inválida');
        }
        if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
          throw new Error('valor_unitario inválido');
        }

        let fechaServicio: string;
        if (fechaRaw instanceof Date) {
          fechaServicio = fechaRaw.toISOString().slice(0, 10);
        } else if (typeof fechaRaw === 'string' && fechaRaw.trim()) {
          const parsed = new Date(fechaRaw);
          if (Number.isNaN(parsed.getTime())) {
            throw new Error('fecha inválida');
          }
          fechaServicio = parsed.toISOString().slice(0, 10);
        } else {
          throw new Error('fecha inválida o faltante');
        }

        // Redondeo a 4 decimales (no 2): valor_unitario y cantidad reales pueden
        // traer hasta 4 decimales (ver 08-alter-detalles-precision.sql) y redondear
        // a 2 truncaba subtotales de insumos de bajo costo unitario.
        const subtotal = Math.round(cantidad * valorUnitario * 10000) / 10000;

        detallesACrear.push({
          planillaId: id,
          codigoTpsns,
          descripcion: descripcion || codigoTpsns,
          beneficiarioNombre,
          beneficiarioIdentificacion,
          fechaServicio,
          cantidad,
          valorUnitarioSolicitado: valorUnitario,
          subtotalSolicitado: subtotal,
          estadoFila: 'PENDIENTE',
        });
      } catch (err) {
        errores.push(`Fila ${filaNum}: ${(err as Error).message}`);
      }
    });

    if (detallesACrear.length > 0) {
      const entities = this.detallesRepo.create(detallesACrear);
      const saved = await this.detallesRepo.save(entities);
      filasImportadas = saved.length;
    }

    return { filasImportadas, errores };
  }

  async revisarRiesgo(id: string, dryRun: boolean) {
    const planilla = await this.getPlanillaOr404(id);

    const todosDetalles = await this.detallesRepo.find({
      where: { planillaId: id },
    });

    const pendientesRiesgo = todosDetalles.filter(
      (d) => d.estadoFila === 'PENDIENTE' && d.nivelRiesgo === null,
    );

    if (pendientesRiesgo.length === 0) {
      return { filasEvaluadas: 0, corregidas: 0, requierenRevisionManual: 0 };
    }

    // Para veces_repetido_beneficiario: contar ocurrencias de la misma
    // combinación beneficiario_identificacion + codigo_tpsns en toda la planilla.
    const repeticiones = new Map<string, number>();
    for (const d of todosDetalles) {
      const key = `${d.beneficiarioIdentificacion}::${d.codigoTpsns}`;
      repeticiones.set(key, (repeticiones.get(key) ?? 0) + 1);
    }

    const codigos = [...new Set(pendientesRiesgo.map((d) => d.codigoTpsns))];
    const tarifas = await this.catalogoRepo.find({
      where: codigos.map((c) => ({ codigoTpsns: c })),
    });
    const tarifaPorCodigo = new Map(
      tarifas.map((t) => [t.codigoTpsns, t.valorOficial]),
    );

    let filasEvaluadas = 0;
    let corregidas = 0;
    let requierenRevisionManual = 0;

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      for (const detalle of pendientesRiesgo) {
        const valorOficial = tarifaPorCodigo.get(detalle.codigoTpsns);
        const key = `${detalle.beneficiarioIdentificacion}::${detalle.codigoTpsns}`;
        const vecesRepetido = repeticiones.get(key) ?? 1;

        const valorOficialParaRatio = valorOficial ?? detalle.valorUnitarioSolicitado;
        const ratioValor =
          valorOficialParaRatio > 0
            ? detalle.valorUnitarioSolicitado / valorOficialParaRatio
            : 1;

        let prediccion: PredecirRiesgoResponse;
        try {
          const response = await firstValueFrom(
            this.httpService.post<PredecirRiesgoResponse>(
              `${this.fastApiUrl}/predecir-riesgo`,
              {
                cantidad: detalle.cantidad,
                valor_unitario_solicitado: detalle.valorUnitarioSolicitado,
                valor_unitario_oficial: valorOficialParaRatio,
                veces_repetido_beneficiario: vecesRepetido,
              },
            ),
          );
          prediccion = response.data;
        } catch (err) {
          // Si el ML respondió (por ejemplo 422 por un dato fuera de lo que
          // espera, en vez de no poder contactarlo) incluimos su detalle:
          // sin esto el mensaje de error solo decía "Request failed with
          // status code 422" y no se veía qué campo/fila lo causó.
          const detalleMl = (err as { response?: { data?: unknown } })
            ?.response?.data;
          const detalleTexto = detalleMl
            ? ` — detalle: ${JSON.stringify(detalleMl)}`
            : '';
          throw new BadRequestException(
            `No se pudo contactar el servicio ML en ${this.fastApiUrl} (fila con código ${
              detalle.codigoTpsns
            }): ${(err as Error).message}${detalleTexto}`,
          );
        }

        filasEvaluadas++;

        const shapFactores = Object.entries(prediccion.shap_values)
          .map(([feature, valor]) => ({
            feature,
            pct: Math.round(valor * 100),
          }))
          .sort((a, b) => b.pct - a.pct);

        const esAltoRiesgo =
          prediccion.label === 'ALTO' || prediccion.label === 'CRITICO';

        const diff = valorOficial
          ? Math.abs(detalle.valorUnitarioSolicitado - valorOficial)
          : 0;
        const debeCorregir =
          esAltoRiesgo &&
          valorOficial !== undefined &&
          diff > CORRECCION_TOLERANCIA;

        if (debeCorregir) {
          corregidas++;
        } else if (esAltoRiesgo) {
          requierenRevisionManual++;
        }

        if (!dryRun) {
          detalle.nivelRiesgo = prediccion.label;
          detalle.scoreRiesgo = prediccion.score;
          detalle.shapFactores = shapFactores;

          if (debeCorregir && valorOficial !== undefined) {
            const valorAnterior = detalle.valorUnitarioSolicitado;
            const subtotalAnterior = detalle.subtotalSolicitado;
            const valorCorregido = valorOficial;
            const subtotalCorregido =
              Math.round(detalle.cantidad * valorCorregido * 10000) / 10000;

            detalle.valorUnitarioSolicitado = valorCorregido;
            detalle.subtotalSolicitado = subtotalCorregido;

            await runner.manager.save(DetalleServicio, detalle);

            const correccion = runner.manager.create(CorreccionAutomatica, {
              detalleServicioId: detalle.id,
              valorAnterior,
              valorCorregido,
              subtotalAnterior,
              subtotalCorregido,
              scoreRiesgo: prediccion.score,
              nivelRiesgo: prediccion.label,
              motivo: `Corrección automática: nivel de riesgo ${prediccion.label} (score ${prediccion.score.toFixed(
                2,
              )}). Valor solicitado ($${valorAnterior.toFixed(
                2,
              )}) difiere del valor oficial de catálogo ($${valorOficial.toFixed(
                2,
              )}) para el código ${detalle.codigoTpsns}.`,
            });
            await runner.manager.save(CorreccionAutomatica, correccion);
          } else {
            await runner.manager.save(DetalleServicio, detalle);
          }
        }
      }

      if (!dryRun) {
        planilla.evaluadaIa = true;
        await runner.manager.save(Planilla, planilla);
        await runner.commitTransaction();
      } else {
        await runner.rollbackTransaction();
      }
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }

    return { filasEvaluadas, corregidas, requierenRevisionManual };
  }

  async correccionesDePlanilla(id: string) {
    await this.getPlanillaOr404(id);
    const detalles = await this.detallesRepo.find({
      where: { planillaId: id },
      select: ['id'],
    });
    const detalleIds = detalles.map((d) => d.id);
    if (detalleIds.length === 0) {
      return [];
    }
    const correcciones = await this.correccionesRepo
      .createQueryBuilder('correccion')
      .leftJoinAndSelect('correccion.detalleServicio', 'detalle')
      .where('correccion.detalle_servicio_id IN (:...detalleIds)', {
        detalleIds,
      })
      .orderBy('correccion.fecha', 'DESC')
      .getMany();
    return correcciones;
  }

  async consolidado(id: string) {
    const planilla = await this.planillasRepo.findOne({
      where: { id },
      relations: ['proveedor'],
    });
    if (!planilla) {
      throw new NotFoundException('Planilla no encontrada');
    }

    const detalles = await this.detallesRepo.find({
      where: { planillaId: id },
      order: { beneficiarioNombre: 'ASC' },
    });

    const porBeneficiario = new Map<
      string,
      {
        beneficiarioNombre: string;
        beneficiarioIdentificacion: string;
        cantidadServicios: number;
        total: number;
        fueCorregido: boolean;
      }
    >();

    for (const d of detalles) {
      const key = d.beneficiarioIdentificacion;
      const actual = porBeneficiario.get(key);
      if (actual) {
        actual.cantidadServicios += 1;
        actual.total += d.subtotalSolicitado;
      } else {
        porBeneficiario.set(key, {
          beneficiarioNombre: d.beneficiarioNombre,
          beneficiarioIdentificacion: d.beneficiarioIdentificacion,
          cantidadServicios: 1,
          total: d.subtotalSolicitado,
          fueCorregido: false,
        });
      }
    }

    // Marcar si algún detalle del beneficiario tuvo corrección automática.
    const detalleIds = detalles.map((d) => d.id);
    if (detalleIds.length > 0) {
      const correcciones = await this.correccionesRepo
        .createQueryBuilder('correccion')
        .leftJoinAndSelect('correccion.detalleServicio', 'detalle')
        .where('correccion.detalle_servicio_id IN (:...detalleIds)', {
          detalleIds,
        })
        .getMany();
      const idsConCorreccion = new Set(
        correcciones.map((c) => c.detalleServicio.beneficiarioIdentificacion),
      );
      for (const [key, fila] of porBeneficiario) {
        if (idsConCorreccion.has(key)) {
          fila.fueCorregido = true;
        }
      }
    }

    const filas = [...porBeneficiario.values()].map((f) => ({
      ...f,
      total: Math.round(f.total * 100) / 100,
    }));
    const totalGeneral =
      Math.round(filas.reduce((sum, f) => sum + f.total, 0) * 100) / 100;

    return {
      planilla: {
        id: planilla.id,
        codigo: planilla.codigo,
        proveedor: {
          id: planilla.proveedor.id,
          nombre: planilla.proveedor.nombre,
        },
        tipoServicio: planilla.tipoServicio,
        mesAnoPrestacion: planilla.mesAnoPrestacion,
        fechaCarga: planilla.fechaCarga,
        estado: planilla.estado,
        evaluadaIa: planilla.evaluadaIa,
      },
      filas,
      totalGeneral,
    };
  }
}

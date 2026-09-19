import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { CatalogoTarifa } from '../entities/catalogo-tarifa.entity';
import { CreateCatalogoDto } from './dto/create-catalogo.dto';
import { UpdateCatalogoDto } from './dto/update-catalogo.dto';

interface FilaCatalogoImportada {
  codigoTpsns: string;
  descripcion: string;
  valorOficial: number;
  tipoProcedimiento: string | null;
  nivel: string | null;
}

// El catálogo real (ej. CODIGOSNOENCON.xlsx) usa encabezados en mayúsculas
// (TIPO_PROCEDIMIENTO, NIVEL, CODIGO, NOMBRE, VALOR_II); un catálogo armado a mano
// puede usar los mismos nombres que ya expone el sistema (codigo_tpsns, descripcion,
// valor_oficial). Se aceptan ambos esquemas de encabezado, sin distinguir mayúsculas.
function leerCampo(row: Record<string, unknown>, ...claves: string[]): unknown {
  const entradas = Object.entries(row);
  for (const clave of claves) {
    const match = entradas.find(([k]) => k.trim().toLowerCase() === clave.toLowerCase());
    if (match && match[1] !== null && match[1] !== undefined && match[1] !== '') {
      return match[1];
    }
  }
  return null;
}

const CHUNK_SIZE = 400;

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(CatalogoTarifa)
    private readonly catalogoRepo: Repository<CatalogoTarifa>,
  ) {}

  async findAll(q?: string, page = 1, pageSize = 50) {
    const pageNum = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const size =
      Number.isFinite(pageSize) && pageSize > 0 ? Math.min(Math.floor(pageSize), 200) : 50;

    const qb = this.catalogoRepo
      .createQueryBuilder('c')
      .orderBy('c.codigo_tpsns', 'ASC');

    if (q && q.trim()) {
      qb.where('c.codigo_tpsns ILIKE :q OR c.descripcion ILIKE :q', {
        q: `%${q.trim()}%`,
      });
    }

    const [items, total] = await qb
      .skip((pageNum - 1) * size)
      .take(size)
      .getManyAndCount();

    return { items, total, page: pageNum, pageSize: size };
  }

  async findOne(id: string) {
    const item = await this.catalogoRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Código de catálogo no encontrado');
    }
    return item;
  }

  async create(dto: CreateCatalogoDto) {
    const codigo = dto.codigo_tpsns.trim();
    const existente = await this.catalogoRepo.findOne({ where: { codigoTpsns: codigo } });
    if (existente) {
      throw new ConflictException(`Ya existe un código de catálogo con codigo_tpsns "${codigo}"`);
    }

    const entity = this.catalogoRepo.create({
      codigoTpsns: codigo,
      descripcion: dto.descripcion.trim(),
      valorOficial: dto.valor_oficial,
      tipoProcedimiento: dto.tipo_procedimiento?.trim() || null,
      nivel: dto.nivel?.trim() || null,
      actualizadoEn: new Date(),
    });
    return this.catalogoRepo.save(entity);
  }

  async update(id: string, dto: UpdateCatalogoDto) {
    const item = await this.findOne(id);

    if (dto.codigo_tpsns && dto.codigo_tpsns.trim() !== item.codigoTpsns) {
      const nuevoCodigo = dto.codigo_tpsns.trim();
      const existente = await this.catalogoRepo.findOne({ where: { codigoTpsns: nuevoCodigo } });
      if (existente) {
        throw new ConflictException(
          `Ya existe un código de catálogo con codigo_tpsns "${nuevoCodigo}"`,
        );
      }
      item.codigoTpsns = nuevoCodigo;
    }
    if (dto.descripcion !== undefined) item.descripcion = dto.descripcion.trim();
    if (dto.valor_oficial !== undefined) item.valorOficial = dto.valor_oficial;
    if (dto.tipo_procedimiento !== undefined) {
      item.tipoProcedimiento = dto.tipo_procedimiento.trim() || null;
    }
    if (dto.nivel !== undefined) item.nivel = dto.nivel.trim() || null;
    item.actualizadoEn = new Date();

    return this.catalogoRepo.save(item);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.catalogoRepo.remove(item);
    return { eliminado: true };
  }

  async importar(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Archivo requerido (campo "archivo")');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo. Verifique que sea .xlsx o .xlsm válido',
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('El archivo no contiene hojas');
    }
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (rows.length === 0) {
      throw new BadRequestException('El archivo no contiene filas de datos');
    }

    const errores: string[] = [];
    const filasValidas: FilaCatalogoImportada[] = [];
    const codigosVistos = new Set<string>();

    rows.forEach((row, index) => {
      const filaNum = index + 2; // +1 encabezado, +1 base 1
      try {
        const codigoRaw = leerCampo(row, 'CODIGO', 'codigo_tpsns', 'codigo');
        const nombreRaw = leerCampo(row, 'NOMBRE', 'descripcion', 'nombre');
        const valorRaw = leerCampo(row, 'VALOR_II', 'valor_oficial', 'valor');
        const tipoRaw = leerCampo(row, 'TIPO_PROCEDIMIENTO', 'tipo_procedimiento');
        const nivelRaw = leerCampo(row, 'NIVEL', 'nivel');

        if (codigoRaw === null) {
          throw new Error('Falta el código (columna CODIGO / codigo_tpsns)');
        }
        const codigoTpsns = String(codigoRaw).trim();
        if (!codigoTpsns) {
          throw new Error('Código vacío');
        }

        if (nombreRaw === null) {
          throw new Error('Falta el nombre/descripción (columna NOMBRE / descripcion)');
        }
        const descripcion = String(nombreRaw).trim();

        if (valorRaw === null) {
          throw new Error('Falta el valor unitario (columna VALOR_II / valor_oficial)');
        }
        const valorOficial = Number(
          typeof valorRaw === 'string' ? valorRaw.replace(',', '.') : valorRaw,
        );
        if (!Number.isFinite(valorOficial) || valorOficial < 0) {
          throw new Error(`Valor unitario inválido: "${valorRaw}"`);
        }

        if (codigosVistos.has(codigoTpsns)) {
          throw new Error(`Código "${codigoTpsns}" repetido dentro del mismo archivo`);
        }
        codigosVistos.add(codigoTpsns);

        filasValidas.push({
          codigoTpsns,
          descripcion,
          valorOficial,
          tipoProcedimiento: tipoRaw ? String(tipoRaw).trim() : null,
          nivel: nivelRaw ? String(nivelRaw).trim() : null,
        });
      } catch (err) {
        errores.push(`Fila ${filaNum}: ${(err as Error).message}`);
      }
    });

    let nuevos = 0;
    let actualizados = 0;

    if (filasValidas.length > 0) {
      // Se calculan nuevos vs. actualizados ANTES del upsert (el upsert de TypeORM
      // no distingue cuáles filas fueron insert vs. update en su resultado).
      const todosLosCodigos = filasValidas.map((f) => f.codigoTpsns);
      const existentesSet = new Set<string>();
      for (let i = 0; i < todosLosCodigos.length; i += CHUNK_SIZE) {
        const lote = todosLosCodigos.slice(i, i + CHUNK_SIZE);
        const encontrados = await this.catalogoRepo.find({
          where: lote.map((codigoTpsns) => ({ codigoTpsns })),
          select: ['codigoTpsns'],
        });
        encontrados.forEach((e) => existentesSet.add(e.codigoTpsns));
      }
      nuevos = filasValidas.filter((f) => !existentesSet.has(f.codigoTpsns)).length;
      actualizados = filasValidas.length - nuevos;

      const ahora = new Date();
      for (let i = 0; i < filasValidas.length; i += CHUNK_SIZE) {
        const lote = filasValidas.slice(i, i + CHUNK_SIZE);
        await this.catalogoRepo.upsert(
          lote.map((f) => ({
            codigoTpsns: f.codigoTpsns,
            descripcion: f.descripcion,
            valorOficial: f.valorOficial,
            tipoProcedimiento: f.tipoProcedimiento,
            nivel: f.nivel,
            actualizadoEn: ahora,
          })),
          ['codigoTpsns'],
        );
      }
    }

    return {
      totalFilas: rows.length,
      nuevos,
      actualizados,
      errores,
    };
  }
}

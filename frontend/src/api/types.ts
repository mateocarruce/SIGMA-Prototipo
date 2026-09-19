// Tipos que reflejan EXACTAMENTE los shapes reales documentados en CONTRACT-ADDENDUM.md
// (verificados contra el backend NestJS en vivo — no son una suposición).

export type Rol = 'ADMIN' | 'AUDITOR' | 'DIGITADOR';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

export interface LoginResponse {
  access_token: string;
  user: Usuario;
}

export interface Proveedor {
  id: string;
  nombre: string;
}

export type EstadoPlanilla = 'PENDIENTE' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA';

export interface Planilla {
  id: string;
  codigo: string;
  proveedor: Proveedor;
  tipoServicio: string;
  mesAnoPrestacion: string;
  fechaCarga: string;
  estado: EstadoPlanilla;
  evaluadaIa: boolean;
  totalDetalles?: number;
  totalSolicitado?: number;
}

export type NivelRiesgo = 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';

export type EstadoFila = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface ShapFactor {
  feature: string;
  pct: number;
}

export interface DetalleServicio {
  id: string;
  planillaId: string;
  codigoTpsns: string;
  descripcion: string;
  beneficiarioNombre: string;
  beneficiarioIdentificacion: string;
  fechaServicio: string;
  cantidad: number;
  valorUnitarioSolicitado: number;
  subtotalSolicitado: number;
  estadoFila: EstadoFila;
  nivelRiesgo: NivelRiesgo | null;
  scoreRiesgo: number | null;
  shapFactores: ShapFactor[] | null;
}

export interface CargarArchivoResponse {
  filasImportadas: number;
  errores: string[];
}

export interface RevisarRiesgoResponse {
  filasEvaluadas: number;
  corregidas: number;
  requierenRevisionManual: number;
}

export interface CorreccionDetalleResumen {
  id: string;
  codigoTpsns: string;
  descripcion: string;
  beneficiarioNombre: string;
  beneficiarioIdentificacion: string;
}

export interface CorreccionPlanillaResumen {
  id: string;
  codigo: string;
  proveedor: Proveedor;
}

// GET /planillas/:id/correcciones -> nested `detalleServicio` (entidad completa)
export interface CorreccionDePlanilla {
  id: string;
  detalleServicioId: string;
  valorAnterior: number;
  valorCorregido: number;
  subtotalAnterior: number;
  subtotalCorregido: number;
  scoreRiesgo: number;
  nivelRiesgo: NivelRiesgo;
  motivo: string;
  fecha: string;
  detalleServicio: DetalleServicio;
}

// GET /correcciones?q= -> nested `detalle` (resumen) + `planilla` + `proveedor` anidado en planilla
export interface CorreccionGlobal {
  id: string;
  detalleServicioId: string;
  valorAnterior: number;
  valorCorregido: number;
  subtotalAnterior: number;
  subtotalCorregido: number;
  scoreRiesgo: number;
  nivelRiesgo: NivelRiesgo;
  motivo: string;
  fecha: string;
  detalle: CorreccionDetalleResumen;
  planilla: CorreccionPlanillaResumen;
}

export interface ConsolidadoFila {
  beneficiarioNombre: string;
  beneficiarioIdentificacion: string;
  cantidadServicios: number;
  total: number;
  fueCorregido: boolean;
}

export interface PlanillaConsolidado {
  planilla: Planilla;
  filas: ConsolidadoFila[];
  totalGeneral: number;
}

export interface CorreccionIndividual {
  valorAnterior: number;
  valorCorregido: number;
  subtotalAnterior: number;
  subtotalCorregido: number;
  motivo: string;
  fecha: string;
}

export interface DetalleIndividual {
  id: string;
  planilla: {
    id: string;
    codigo: string;
    proveedor: Proveedor;
    tipoServicio: string;
    mesAnoPrestacion: string;
  };
  codigoTpsns: string;
  descripcion: string;
  beneficiarioNombre: string;
  beneficiarioIdentificacion: string;
  fechaServicio: string;
  cantidad: number;
  valorOriginalSolicitado: number;
  subtotalOriginalSolicitado: number;
  valorUnitarioActual: number;
  subtotalActual: number;
  estadoFila: EstadoFila;
  nivelRiesgo: NivelRiesgo | null;
  scoreRiesgo: number | null;
  shapFactores: ShapFactor[] | null;
  fueCorregido: boolean;
  correccion: CorreccionIndividual | null;
}

export interface ApiError {
  message: string | string[];
  statusCode?: number;
}

export interface CatalogoItem {
  id: string;
  codigoTpsns: string;
  descripcion: string;
  valorOficial: number;
  tipoProcedimiento: string | null;
  nivel: string | null;
  actualizadoEn: string;
}

export interface CatalogoListResponse {
  items: CatalogoItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ImportarCatalogoResponse {
  totalFilas: number;
  nuevos: number;
  actualizados: number;
  errores: string[];
}

export interface CatalogoItemInput {
  codigo_tpsns: string;
  descripcion: string;
  valor_oficial: number;
  tipo_procedimiento?: string;
  nivel?: string;
}

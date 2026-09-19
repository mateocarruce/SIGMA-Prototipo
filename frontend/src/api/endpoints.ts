import { get, post, http } from './client';
import type {
  CargarArchivoResponse,
  CatalogoItem,
  CatalogoItemInput,
  CatalogoListResponse,
  CorreccionDePlanilla,
  CorreccionGlobal,
  DetalleIndividual,
  DetalleServicio,
  EstadoPlanilla,
  ImportarCatalogoResponse,
  LoginResponse,
  Planilla,
  PlanillaConsolidado,
  Proveedor,
  RevisarRiesgoResponse,
  Usuario,
} from './types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', { email, password });
}

export function me(): Promise<Usuario> {
  return get<Usuario>('/auth/me');
}

export function listProveedores(): Promise<Proveedor[]> {
  return get<Proveedor[]>('/proveedores');
}

export function listPlanillas(estado?: EstadoPlanilla | ''): Promise<Planilla[]> {
  const params = estado ? { estado } : undefined;
  return get<Planilla[]>('/planillas', { params });
}

export function getPlanilla(id: string): Promise<Planilla> {
  return get<Planilla>(`/planillas/${id}`);
}

export function crearPlanilla(body: {
  proveedor_id: string;
  tipo_servicio: string;
  mes_ano_prestacion: string;
}): Promise<Planilla> {
  return post<Planilla>('/planillas', body);
}

export function cargarArchivo(id: string, file: File): Promise<CargarArchivoResponse> {
  const form = new FormData();
  form.append('archivo', file);
  return http
    .post<CargarArchivoResponse>(`/planillas/${id}/cargar-archivo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

export function getDetalles(planillaId: string): Promise<DetalleServicio[]> {
  return get<DetalleServicio[]>(`/planillas/${planillaId}/detalles`);
}

export function revisarRiesgo(planillaId: string, dryRun = false): Promise<RevisarRiesgoResponse> {
  return post<RevisarRiesgoResponse>(`/planillas/${planillaId}/revisar-riesgo`, { dryRun });
}

export function getCorreccionesDePlanilla(planillaId: string): Promise<CorreccionDePlanilla[]> {
  return get<CorreccionDePlanilla[]>(`/planillas/${planillaId}/correcciones`);
}

export function getCorreccionesGlobal(q?: string): Promise<CorreccionGlobal[]> {
  return get<CorreccionGlobal[]>('/correcciones', { params: q ? { q } : undefined });
}

export function getConsolidado(planillaId: string): Promise<PlanillaConsolidado> {
  return get<PlanillaConsolidado>(`/planillas/${planillaId}/consolidado`);
}

export function getDetalleIndividual(detalleId: string): Promise<DetalleIndividual> {
  return get<DetalleIndividual>(`/detalles/${detalleId}/individual`);
}

export function listCatalogo(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<CatalogoListResponse> {
  return get<CatalogoListResponse>('/catalogo', { params });
}

export function crearCatalogoItem(body: CatalogoItemInput): Promise<CatalogoItem> {
  return post<CatalogoItem>('/catalogo', body);
}

export function actualizarCatalogoItem(
  id: string,
  body: Partial<CatalogoItemInput>,
): Promise<CatalogoItem> {
  return http.put<CatalogoItem>(`/catalogo/${id}`, body).then((r) => r.data);
}

export function eliminarCatalogoItem(id: string): Promise<{ eliminado: boolean }> {
  return http.delete<{ eliminado: boolean }>(`/catalogo/${id}`).then((r) => r.data);
}

export function importarCatalogo(file: File): Promise<ImportarCatalogoResponse> {
  const form = new FormData();
  form.append('archivo', file);
  return http
    .post<ImportarCatalogoResponse>('/catalogo/importar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

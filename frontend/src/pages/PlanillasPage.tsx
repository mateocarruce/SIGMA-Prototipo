import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CorreccionGlobal, EstadoPlanilla, Planilla } from '../api/types';
import { EstadoBadge } from '../components/Badges';
import { formatDate, formatMoney } from '../utils/format';

const ESTADOS: { value: EstadoPlanilla | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'RECHAZADA', label: 'Rechazada' },
];

function isSameMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function PlanillasPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // POST /planillas y /cargar-archivo exigen rol ADMIN o DIGITADOR (ver CONTRACT.md §3).
  const puedeCrear = user?.rol === 'ADMIN' || user?.rol === 'DIGITADOR';
  const [planillas, setPlanillas] = useState<Planilla[]>([]);
  const [correcciones, setCorrecciones] = useState<CorreccionGlobal[]>([]);
  const [riesgoAltoCritico, setRiesgoAltoCritico] = useState<number | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPlanilla | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlanillas = useCallback(async (estado: EstadoPlanilla | '') => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listPlanillas(estado || undefined);
      setPlanillas(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Stats globales (no dependen del filtro de estado de la tabla): planillas SIN filtrar +
  // correcciones globales, tal como devuelve el backend real.
  useEffect(() => {
    (async () => {
      try {
        const [allPlanillas, correccionesGlobal] = await Promise.all([
          api.listPlanillas(),
          api.getCorreccionesGlobal(),
        ]);
        setCorrecciones(correccionesGlobal);

        // "riesgo alto/crítico" = filas ya evaluadas cuyo nivelRiesgo es ALTO o CRITICO.
        // No hay endpoint agregado para esto, así que se deriva consultando /detalles de
        // cada planilla ya evaluada por la IA (evaluadaIa=true) y contando los niveles reales.
        const evaluadas = allPlanillas.filter((p) => p.evaluadaIa);
        const detallesPorPlanilla = await Promise.all(
          evaluadas.map((p) => api.getDetalles(p.id).catch(() => [])),
        );
        const count = detallesPorPlanilla
          .flat()
          .filter((d) => d.nivelRiesgo === 'ALTO' || d.nivelRiesgo === 'CRITICO').length;
        setRiesgoAltoCritico(count);
      } catch {
        // Los stats son un "extra" informativo: si fallan, el dashboard sigue siendo usable.
        setRiesgoAltoCritico(null);
      }
    })();
  }, []);

  useEffect(() => {
    loadPlanillas(estadoFiltro);
  }, [estadoFiltro, loadPlanillas]);

  const totalPlanillas = planillas.length;

  const stats = useMemo(() => {
    const now = new Date();
    const correccionesDelMes = correcciones.filter((c) => isSameMonth(c.fecha, now)).length;
    const pendientes = planillas.filter((p) => p.estado === 'PENDIENTE').length;
    return { correccionesDelMes, pendientes };
  }, [planillas, correcciones]);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planillas</h1>
          <p className="page-subtitle">Auditoría de planillas de cargos médicos con evaluación de riesgo por IA.</p>
        </div>
        {puedeCrear && (
          <Link to="/planillas/nueva" className="btn btn-primary">
            + Nueva carga
          </Link>
        )}
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <p className="stat-label">Total planillas</p>
          <div className="stat-value">{totalPlanillas}</div>
        </div>
        <div className="card stat-card">
          <p className="stat-label">Pendientes</p>
          <div className="stat-value">{stats.pendientes}</div>
        </div>
        <div className="card stat-card">
          <p className="stat-label">Filas riesgo alto / crítico</p>
          <div className="stat-value accent-danger">{riesgoAltoCritico ?? '—'}</div>
        </div>
        <div className="card stat-card">
          <p className="stat-label">Correcciones del mes</p>
          <div className="stat-value accent-brand">{stats.correccionesDelMes}</div>
        </div>
      </div>

      <div className="chip-row">
        {ESTADOS.map((e) => (
          <button
            key={e.value || 'todas'}
            className={`chip${estadoFiltro === e.value ? ' active' : ''}`}
            onClick={() => setEstadoFiltro(e.value)}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="card">
        {error && (
          <div className="card-pad">
            <div className="alert alert-error">{error}</div>
          </div>
        )}
        {loading ? (
          <div className="empty-state">
            <span className="spinner" /> Cargando planillas…
          </div>
        ) : planillas.length === 0 ? (
          <div className="empty-state">No hay planillas con este filtro.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Proveedor</th>
                  <th>Servicio</th>
                  <th>Periodo</th>
                  <th>Fecha carga</th>
                  <th>Estado</th>
                  <th>Evaluada IA</th>
                  <th>Filas</th>
                  <th style={{ textAlign: 'right' }}>Total solicitado</th>
                </tr>
              </thead>
              <tbody>
                {planillas.map((p) => (
                  <tr
                    key={p.id}
                    className="clickable"
                    onClick={() => navigate(`/planillas/${p.id}/revisar-riesgo`)}
                  >
                    <td className="mono">{p.codigo}</td>
                    <td>{p.proveedor.nombre}</td>
                    <td>{p.tipoServicio}</td>
                    <td>{p.mesAnoPrestacion}</td>
                    <td className="text-muted">{formatDate(p.fechaCarga)}</td>
                    <td>
                      <EstadoBadge estado={p.estado} />
                    </td>
                    <td>{p.evaluadaIa ? 'Sí' : 'No'}</td>
                    <td>{p.totalDetalles ?? '—'}</td>
                    <td className="money" style={{ textAlign: 'right' }}>
                      {p.totalSolicitado !== undefined ? formatMoney(p.totalSolicitado) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as api from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { DetalleServicio, NivelRiesgo, Planilla, RevisarRiesgoResponse } from '../api/types';
import { RiskBadge } from '../components/Badges';
import { formatDate, formatMoney } from '../utils/format';

const NIVELES: (NivelRiesgo | '')[] = ['', 'BAJO', 'MEDIO', 'ALTO', 'CRITICO'];

const FEATURE_LABEL: Record<string, string> = {
  ratio_valor: 'Ratio valor solicitado / oficial',
  cantidad: 'Cantidad',
  veces_repetido_beneficiario: 'Repeticiones del beneficiario',
};

export function RevisarRiesgoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // POST /revisar-riesgo exige rol ADMIN o AUDITOR (ver CONTRACT.md §3).
  const puedeEvaluar = user?.rol === 'ADMIN' || user?.rol === 'AUDITOR';

  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [detalles, setDetalles] = useState<DetalleServicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<RevisarRiesgoResponse | null>(null);
  const [filtroNivel, setFiltroNivel] = useState<NivelRiesgo | ''>('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [p, d] = await Promise.all([api.getPlanilla(id), api.getDetalles(id)]);
      setPlanilla(p);
      setDetalles(d);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRevisarRiesgo() {
    if (!id) return;
    setEvaluando(true);
    setError(null);
    try {
      const res = await api.revisarRiesgo(id, false);
      setResumen(res);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setEvaluando(false);
    }
  }

  const yaEvaluada = planilla?.evaluadaIa ?? detalles.some((d) => d.nivelRiesgo !== null);

  const detallesFiltrados = useMemo(
    () => (filtroNivel ? detalles.filter((d) => d.nivelRiesgo === filtroNivel) : detalles),
    [detalles, filtroNivel],
  );

  const conteoPorNivel = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const d of detalles) {
      if (d.nivelRiesgo) acc[d.nivelRiesgo] = (acc[d.nivelRiesgo] ?? 0) + 1;
    }
    return acc;
  }, [detalles]);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Revisión de riesgo {planilla && <span className="mono text-muted">— {planilla.codigo}</span>}
          </h1>
          <p className="page-subtitle">
            {planilla ? `${planilla.proveedor.nombre} · ${planilla.tipoServicio} · ${planilla.mesAnoPrestacion}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {puedeEvaluar && (
            <button className="btn btn-primary" onClick={onRevisarRiesgo} disabled={evaluando || loading}>
              {evaluando ? <span className="spinner" /> : yaEvaluada ? 'Volver a evaluar riesgo' : 'Revisar riesgo'}
            </button>
          )}
          {yaEvaluada && (
            <button className="btn btn-secondary" onClick={() => navigate(`/planillas/${id}/consolidado`)}>
              Generar planilla consolidada
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!puedeEvaluar && !yaEvaluada && (
        <div className="alert alert-info">
          Tu rol ({user?.rol}) no puede ejecutar la evaluación de riesgo. Esta acción requiere rol ADMIN o
          AUDITOR.
        </div>
      )}

      {resumen && (
        <div className="alert alert-info">
          Evaluación completada: <strong>{resumen.filasEvaluadas}</strong> filas evaluadas,{' '}
          <strong>{resumen.corregidas}</strong> corregidas automáticamente,{' '}
          <strong>{resumen.requierenRevisionManual}</strong> requieren revisión manual.
        </div>
      )}

      {yaEvaluada && (
        <div className="chip-row">
          <button className={`chip${filtroNivel === '' ? ' active' : ''}`} onClick={() => setFiltroNivel('')}>
            Todas ({detalles.length})
          </button>
          {NIVELES.filter(Boolean).map((n) => (
            <button
              key={n}
              className={`chip${filtroNivel === n ? ' active' : ''}`}
              onClick={() => setFiltroNivel(n as NivelRiesgo)}
            >
              {n} ({conteoPorNivel[n as string] ?? 0})
            </button>
          ))}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <span className="spinner" /> Cargando detalles…
          </div>
        ) : detalles.length === 0 ? (
          <div className="empty-state">Esta planilla no tiene filas cargadas.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Beneficiario</th>
                  <th>Fecha</th>
                  <th style={{ textAlign: 'right' }}>Cant.</th>
                  <th style={{ textAlign: 'right' }}>Valor unit.</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                  <th>Riesgo</th>
                  <th style={{ textAlign: 'right' }}>Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {detallesFiltrados.map((d) => {
                  const isOpen = expandido === d.id;
                  const puedeExpandir = !!d.shapFactores && d.shapFactores.length > 0;
                  return (
                    <Fragment key={d.id}>
                      <tr
                        className={puedeExpandir ? 'clickable' : undefined}
                        onClick={() => puedeExpandir && setExpandido(isOpen ? null : d.id)}
                      >
                        <td>
                          {puedeExpandir && (
                            <button
                              className={`expand-toggle${isOpen ? ' open' : ''}`}
                              aria-label="Ver factores"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandido(isOpen ? null : d.id);
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M9 6l6 6-6 6"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          )}
                        </td>
                        <td className="mono">{d.codigoTpsns}</td>
                        <td>{d.descripcion}</td>
                        <td>
                          {d.beneficiarioNombre}
                          <div className="text-faint mono" style={{ fontSize: 11.5 }}>
                            {d.beneficiarioIdentificacion}
                          </div>
                        </td>
                        <td className="text-muted">{formatDate(d.fechaServicio)}</td>
                        <td style={{ textAlign: 'right' }}>{d.cantidad}</td>
                        <td className="money" style={{ textAlign: 'right' }}>
                          {formatMoney(d.valorUnitarioSolicitado)}
                        </td>
                        <td className="money" style={{ textAlign: 'right' }}>
                          {formatMoney(d.subtotalSolicitado)}
                        </td>
                        <td>
                          <RiskBadge nivel={d.nivelRiesgo} />
                        </td>
                        <td className="mono" style={{ textAlign: 'right' }}>
                          {d.scoreRiesgo !== null ? d.scoreRiesgo.toFixed(2) : '—'}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <Link to={`/detalles/${d.id}/individual`} className="btn btn-ghost" style={{ padding: '4px 10px' }}>
                            Ver individual
                          </Link>
                        </td>
                      </tr>
                      {isOpen && d.shapFactores && (
                        <tr className="risk-row-expand">
                          <td colSpan={11} style={{ padding: '14px 20px' }}>
                            <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10, fontWeight: 600 }}>
                              Factores del modelo (SHAP) para esta predicción
                            </div>
                            {d.shapFactores.map((f) => (
                              <div className="shap-bar-row" key={f.feature}>
                                <span>{FEATURE_LABEL[f.feature] ?? f.feature}</span>
                                <div className="shap-bar-track">
                                  <div className="shap-bar-fill" style={{ width: `${Math.min(100, f.pct)}%` }} />
                                </div>
                                <span className="mono text-muted">{f.pct}%</span>
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Link to="/planillas" className="text-muted" style={{ fontSize: 13 }}>
          ← Volver a planillas
        </Link>
      </div>
    </div>
  );
}

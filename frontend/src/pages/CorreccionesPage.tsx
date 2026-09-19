import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import type { CorreccionGlobal } from '../api/types';
import { RiskBadge } from '../components/Badges';
import { SearchIcon } from '../components/icons';
import { formatDateTime, formatMoney } from '../utils/format';

export function CorreccionesPage() {
  const [q, setQ] = useState('');
  const [correcciones, setCorrecciones] = useState<CorreccionGlobal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCorreccionesGlobal(query || undefined);
      setCorrecciones(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load('');
  }, [load]);

  // Debounce simple para no spamear /api/correcciones?q= en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => load(q), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Correcciones automáticas</h1>
          <p className="page-subtitle">Historial global de correcciones aplicadas por el modelo de IA.</p>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div style={{ position: 'relative', maxWidth: 380 }}>
          <span
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-faint)',
              pointerEvents: 'none',
            }}
          >
            <SearchIcon size={15} />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por beneficiario, código, planilla…"
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              border: '1px solid var(--color-border-strong)',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div className="card">
        {error && (
          <div className="card-pad">
            <div className="alert alert-error">{error}</div>
          </div>
        )}
        {loading ? (
          <div className="empty-state">
            <span className="spinner" /> Cargando correcciones…
          </div>
        ) : correcciones.length === 0 ? (
          <div className="empty-state">No se encontraron correcciones.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Planilla</th>
                  <th>Proveedor</th>
                  <th>Código</th>
                  <th>Beneficiario</th>
                  <th style={{ textAlign: 'right' }}>Valor anterior</th>
                  <th style={{ textAlign: 'right' }}>Valor corregido</th>
                  <th>Nivel riesgo</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {correcciones.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.planilla.codigo}</td>
                    <td>{c.planilla.proveedor.nombre}</td>
                    <td className="mono">{c.detalle.codigoTpsns}</td>
                    <td>
                      {c.detalle.beneficiarioNombre}
                      <div className="text-faint mono" style={{ fontSize: 11.5 }}>
                        {c.detalle.beneficiarioIdentificacion}
                      </div>
                    </td>
                    <td className="money" style={{ textAlign: 'right' }}>
                      {formatMoney(c.valorAnterior)}
                    </td>
                    <td className="money" style={{ textAlign: 'right' }}>
                      {formatMoney(c.valorCorregido)}
                    </td>
                    <td>
                      <RiskBadge nivel={c.nivelRiesgo} />
                    </td>
                    <td className="text-muted">{formatDateTime(c.fecha)}</td>
                    <td>
                      <Link to={`/detalles/${c.detalleServicioId}/individual`} className="btn btn-ghost" style={{ padding: '4px 10px' }}>
                        Ver
                      </Link>
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

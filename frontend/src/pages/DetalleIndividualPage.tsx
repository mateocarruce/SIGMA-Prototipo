import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import type { DetalleIndividual } from '../api/types';
import { RiskBadge } from '../components/Badges';
import { PrintIcon } from '../components/icons';
import { formatDate, formatMoney } from '../utils/format';

const HEADER_TITLE = 'CENTRO CLÍNICO QUIRÚRGICO AMBULATORIO';
const HEADER_SUBTITLE = 'HOSPITAL DEL DÍA CHIMBACALLE';

export function DetalleIndividualPage() {
  const { id } = useParams<{ id: string }>();
  const [detalle, setDetalle] = useState<DetalleIndividual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getDetalleIndividual(id)
      .then(setDetalle)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="container">
      <div className="doc-toolbar">
        <Link to={detalle ? `/planillas/${detalle.planilla.id}/revisar-riesgo` : '/planillas'} className="text-muted" style={{ fontSize: 13 }}>
          ← Volver a la revisión de riesgo
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()} disabled={!detalle}>
          <PrintIcon size={15} /> Imprimir
        </button>
      </div>

      {loading && (
        <div className="card empty-state">
          <span className="spinner" /> Cargando planilla individual…
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {detalle && (
        <div className="doc-page">
          <div className="doc-header">
            <h1>{HEADER_TITLE}</h1>
            <h2>{HEADER_SUBTITLE}</h2>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 10, textDecoration: 'underline' }}>
              PLANILLA DE CARGOS INDIVIDUAL
            </div>
          </div>

          <div className="doc-infobox">
            <div className="doc-infobox-grid">
              <div>
                <strong>Planilla N.°:</strong> {detalle.planilla.codigo}
              </div>
              <div>
                <strong>Proveedor:</strong> {detalle.planilla.proveedor.nombre}
              </div>
              <div>
                <strong>Tipo de servicio:</strong> {detalle.planilla.tipoServicio}
              </div>
              <div>
                <strong>Periodo de prestación:</strong> {detalle.planilla.mesAnoPrestacion}
              </div>
              <div className="full">
                <strong>Beneficiario:</strong> {detalle.beneficiarioNombre} — C.I. {detalle.beneficiarioIdentificacion}
              </div>
            </div>
          </div>

          <table className="doc-table">
            <thead>
              <tr>
                <th>Código TPSNS</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Cant.</th>
                <th>Valor unit. solicitado</th>
                <th>Subtotal solicitado</th>
                {detalle.fueCorregido && (
                  <>
                    <th>Valor unit. corregido</th>
                    <th>Subtotal corregido</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="center">{detalle.codigoTpsns}</td>
                <td>{detalle.descripcion}</td>
                <td className="center">{formatDate(detalle.fechaServicio)}</td>
                <td className="center">{detalle.cantidad}</td>
                <td className="num">{formatMoney(detalle.valorOriginalSolicitado)}</td>
                <td className="num">{formatMoney(detalle.subtotalOriginalSolicitado)}</td>
                {detalle.fueCorregido && (
                  <>
                    <td className="num">{formatMoney(detalle.valorUnitarioActual)}</td>
                    <td className="num">{formatMoney(detalle.subtotalActual)}</td>
                  </>
                )}
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={detalle.fueCorregido ? 5 : 4}>TOTAL</td>
                <td className="num">
                  {formatMoney(detalle.fueCorregido ? detalle.subtotalActual : detalle.subtotalOriginalSolicitado)}
                </td>
                {detalle.fueCorregido && <td colSpan={2}></td>}
              </tr>
            </tfoot>
          </table>

          {detalle.nivelRiesgo && (
            <div className="no-print" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, color: '#555' }}>Nivel de riesgo evaluado por IA:</span>
              <RiskBadge nivel={detalle.nivelRiesgo} />
              {detalle.scoreRiesgo !== null && (
                <span className="mono" style={{ fontSize: 12 }}>
                  (score {detalle.scoreRiesgo.toFixed(2)})
                </span>
              )}
            </div>
          )}

          {detalle.fueCorregido && detalle.correccion && (
            <div className="doc-corrected-note" style={{ marginBottom: 24 }}>
              <strong>Nota de corrección automática:</strong> {detalle.correccion.motivo} (
              {formatDate(detalle.correccion.fecha)})
            </div>
          )}

          <div className="doc-signatures">
            <div className="doc-sig-block">
              <div className="doc-sig-line">REVISADO</div>
              <div className="doc-sig-sello">SELLO:</div>
            </div>
            <div className="doc-sig-block">
              <div className="doc-sig-line">APROBADO</div>
              <div className="doc-sig-sello">SELLO:</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

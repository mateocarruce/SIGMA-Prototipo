import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import type { PlanillaConsolidado } from '../api/types';
import { PrintIcon } from '../components/icons';
import { formatDate, formatMoney } from '../utils/format';

const HEADER_TITLE = 'CENTRO CLÍNICO QUIRÚRGICO AMBULATORIO';
const HEADER_SUBTITLE = 'HOSPITAL DEL DÍA CHIMBACALLE';

export function ConsolidadoPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PlanillaConsolidado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .getConsolidado(id)
      .then(setData)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="container">
      <div className="doc-toolbar">
        <Link to={id ? `/planillas/${id}/revisar-riesgo` : '/planillas'} className="text-muted" style={{ fontSize: 13 }}>
          ← Volver a la revisión de riesgo
        </Link>
        <button className="btn btn-primary" onClick={() => window.print()} disabled={!data}>
          <PrintIcon size={15} /> Imprimir
        </button>
      </div>

      {loading && (
        <div className="card empty-state">
          <span className="spinner" /> Cargando planilla consolidada…
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {data && (
        <div className="doc-page">
          <div className="doc-header">
            <h1>{HEADER_TITLE}</h1>
            <h2>{HEADER_SUBTITLE}</h2>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 10, textDecoration: 'underline' }}>
              PLANILLA DE CARGOS CONSOLIDADO
            </div>
          </div>

          <div className="doc-infobox">
            <div className="doc-infobox-grid">
              <div>
                <strong>Planilla N.°:</strong> {data.planilla.codigo}
              </div>
              <div>
                <strong>Proveedor:</strong> {data.planilla.proveedor.nombre}
              </div>
              <div>
                <strong>Tipo de servicio:</strong> {data.planilla.tipoServicio}
              </div>
              <div>
                <strong>Periodo de prestación:</strong> {data.planilla.mesAnoPrestacion}
              </div>
              <div>
                <strong>Fecha de carga:</strong> {formatDate(data.planilla.fechaCarga)}
              </div>
              <div>
                <strong>N.° de beneficiarios:</strong> {data.filas.length}
              </div>
            </div>
          </div>

          <table className="doc-table">
            <thead>
              <tr>
                <th>Beneficiario</th>
                <th>C.I.</th>
                <th>N.° servicios</th>
                <th>Total</th>
                <th>Corregido</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f) => (
                <tr key={f.beneficiarioIdentificacion}>
                  <td>{f.beneficiarioNombre}</td>
                  <td className="center">{f.beneficiarioIdentificacion}</td>
                  <td className="center">{f.cantidadServicios}</td>
                  <td className="num">{formatMoney(f.total)}</td>
                  <td className="center">{f.fueCorregido ? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>TOTAL GENERAL</td>
                <td className="num">{formatMoney(data.totalGeneral)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

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

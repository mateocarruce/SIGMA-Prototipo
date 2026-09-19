import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CargarArchivoResponse, Planilla, Proveedor } from '../api/types';
import { CheckCircleIcon, UploadIcon } from '../components/icons';

const STEPS = ['Archivo', 'Datos', 'Validación', 'Confirmación'];

const TIPOS_SERVICIO = ['Consulta Externa', 'Emergencia', 'Hospitalización', 'Laboratorio', 'Imagenología'];

function currentMesAno(): string {
  const meses = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ];
  const now = new Date();
  return `${meses[now.getMonth()]} ${now.getFullYear()}`;
}

export function NuevaPlanillaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // POST /planillas y /cargar-archivo exigen rol ADMIN o DIGITADOR (ver CONTRACT.md §3).
  const puedeCrear = user?.rol === 'ADMIN' || user?.rol === 'DIGITADOR';

  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [errorProveedores, setErrorProveedores] = useState<string | null>(null);
  const [tipoServicio, setTipoServicio] = useState(TIPOS_SERVICIO[0]);
  const [mesAno, setMesAno] = useState(currentMesAno());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planilla, setPlanilla] = useState<Planilla | null>(null);
  const [cargaResultado, setCargaResultado] = useState<CargarArchivoResponse | null>(null);

  // Los proveedores se cargan desde /api/proveedores en vez de una lista fija en el
  // frontend: antes estaban hardcodeados con sus UUID reales, y si alguien re-sembraba
  // la base de datos (nuevos UUID aleatorios) esa lista quedaba desactualizada y
  // POST /planillas fallaba con "proveedor_id inválido".
  useEffect(() => {
    let cancelado = false;
    setLoadingProveedores(true);
    setErrorProveedores(null);
    api
      .listProveedores()
      .then((data) => {
        if (cancelado) return;
        setProveedores(data);
        setProveedorId((actual) => actual || data[0]?.id || '');
      })
      .catch((err) => {
        if (!cancelado) setErrorProveedores(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelado) setLoadingProveedores(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  }

  async function submitCreateAndUpload() {
    if (!file || !proveedorId) return;
    setSubmitting(true);
    setError(null);
    try {
      // POST /planillas y POST /:id/cargar-archivo se disparan juntos al confirmar el
      // paso 2 (necesitamos el id de la planilla recién creada antes de poder subir el
      // archivo) — no hay un paso separado de "crear planilla vacía".
      const nuevaPlanilla = await api.crearPlanilla({
        proveedor_id: proveedorId,
        tipo_servicio: tipoServicio,
        mes_ano_prestacion: mesAno,
      });
      setPlanilla(nuevaPlanilla);

      const resultado = await api.cargarArchivo(nuevaPlanilla.id, file);
      setCargaResultado(resultado);
      setStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function goToRevisarRiesgo() {
    if (planilla) navigate(`/planillas/${planilla.id}/revisar-riesgo`);
  }

  if (!puedeCrear) {
    return (
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="alert alert-error">
          Tu rol (<strong>{user?.rol}</strong>) no tiene permiso para crear planillas. Esta acción requiere
          rol ADMIN o DIGITADOR.
        </div>
        <Link to="/planillas" className="btn btn-secondary">
          ← Volver a planillas
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nueva carga de planilla</h1>
          <p className="page-subtitle">Sube el archivo de cargos y completa los datos del trámite.</p>
        </div>
      </div>

      <div className="wizard-steps">
        {STEPS.map((label, i) => (
          <span key={label} style={{ display: 'contents' }}>
            <span className={`wizard-step${i < step ? ' done' : i === step ? ' current' : ''}`}>
              <span className="wizard-step-dot">{i < step ? '✓' : i + 1}</span>
              <span className="wizard-step-label">{label}</span>
            </span>
            {i < STEPS.length - 1 && <span className="wizard-connector" />}
          </span>
        ))}
      </div>

      <div className="card card-pad">
        {error && <div className="alert alert-error">{error}</div>}

        {step === 0 && (
          <>
            <div
              className={`dropzone${file ? ' has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                <UploadIcon />
              </div>
              {file ? (
                <>
                  <strong>{file.name}</strong>
                  <div className="field-hint">{(file.size / 1024).toFixed(1)} KB — clic para cambiar</div>
                </>
              ) : (
                <>
                  Haz clic para seleccionar el archivo de la planilla
                  <div className="field-hint">Formatos aceptados: .xlsx, .xlsm</div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xlsm"
                onChange={onFileChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="wizard-actions">
              <span />
              <button className="btn btn-primary" disabled={!file} onClick={() => setStep(1)}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field">
              <label htmlFor="proveedor">Proveedor</label>
              {errorProveedores ? (
                <div className="alert alert-error" style={{ marginBottom: 0 }}>
                  No se pudo cargar la lista de proveedores: {errorProveedores}
                </div>
              ) : (
                <select
                  id="proveedor"
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  disabled={loadingProveedores}
                >
                  {loadingProveedores && <option>Cargando…</option>}
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="field">
              <label htmlFor="tipoServicio">Tipo de servicio</label>
              <select id="tipoServicio" value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)}>
                {TIPOS_SERVICIO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mesAno">Mes / año de prestación</label>
              <input id="mesAno" type="text" value={mesAno} onChange={(e) => setMesAno(e.target.value)} required />
              <span className="field-hint">Ej. "AGOSTO 2026"</span>
            </div>
            <div className="wizard-actions">
              <button className="btn btn-secondary" onClick={() => setStep(0)} disabled={submitting}>
                Atrás
              </button>
              <button
                className="btn btn-primary"
                onClick={submitCreateAndUpload}
                disabled={submitting || !proveedorId}
              >
                {submitting ? <span className="spinner" /> : 'Crear planilla y subir archivo'}
              </button>
            </div>
          </>
        )}

        {step === 2 && cargaResultado && planilla && (
          <>
            <div className="alert alert-success">
              Planilla <strong className="mono">{planilla.codigo}</strong> creada correctamente.
            </div>
            <dl className="summary-list">
              <div>
                <dt>Filas importadas</dt>
                <dd>{cargaResultado.filasImportadas}</dd>
              </div>
              <div>
                <dt>Errores</dt>
                <dd>{cargaResultado.errores.length}</dd>
              </div>
            </dl>
            {cargaResultado.errores.length > 0 && (
              <div className="alert alert-error" style={{ marginTop: 16 }}>
                <strong>Errores reportados por el servidor:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                  {cargaResultado.errores.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="wizard-actions">
              <span />
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 3 && planilla && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: 'var(--color-brand)', marginBottom: 14 }}>
              <CheckCircleIcon size={48} />
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 17 }}>Carga completada</h2>
            <p className="text-muted" style={{ margin: '0 0 20px' }}>
              La planilla <strong className="mono">{planilla.codigo}</strong> quedó registrada con{' '}
              {cargaResultado?.filasImportadas ?? 0} fila(s). El siguiente paso es evaluar el riesgo con el
              modelo de IA.
            </p>
            <button className="btn btn-primary btn-lg" onClick={goToRevisarRiesgo}>
              Ir a revisar riesgo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

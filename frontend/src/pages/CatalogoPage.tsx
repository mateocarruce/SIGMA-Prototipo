import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/endpoints';
import { apiErrorMessage } from '../api/client';
import type { CatalogoItem, CatalogoItemInput, ImportarCatalogoResponse } from '../api/types';
import { SearchIcon, UploadIcon } from '../components/icons';
import { formatDateTime, formatMoneyPreciso } from '../utils/format';

const PAGE_SIZE = 25;

interface FormState {
  codigo_tpsns: string;
  descripcion: string;
  valor_oficial: string;
  tipo_procedimiento: string;
  nivel: string;
}

const FORM_VACIO: FormState = {
  codigo_tpsns: '',
  descripcion: '',
  valor_oficial: '',
  tipo_procedimiento: '',
  nivel: '',
};

export function CatalogoPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalAbierto, setModalAbierto] = useState<'crear' | 'editar' | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<ImportarCatalogoResponse | null>(
    null,
  );
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);

  const load = useCallback(async (query: string, pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listCatalogo({ q: query || undefined, page: pageNum, pageSize: PAGE_SIZE });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(q, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Debounce de búsqueda: vuelve siempre a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      if (page === 1) load(q, 1);
      else setPage(1);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function abrirCrear() {
    setForm(FORM_VACIO);
    setFormError(null);
    setEditandoId(null);
    setModalAbierto('crear');
  }

  function abrirEditar(item: CatalogoItem) {
    setForm({
      codigo_tpsns: item.codigoTpsns,
      descripcion: item.descripcion,
      valor_oficial: String(item.valorOficial),
      tipo_procedimiento: item.tipoProcedimiento ?? '',
      nivel: item.nivel ?? '',
    });
    setFormError(null);
    setEditandoId(item.id);
    setModalAbierto('editar');
  }

  function cerrarModal() {
    setModalAbierto(null);
  }

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const valor = Number(form.valor_oficial.replace(',', '.'));
    if (!form.codigo_tpsns.trim() || !form.descripcion.trim()) {
      setFormError('Código y descripción/nombre son obligatorios');
      return;
    }
    if (!Number.isFinite(valor) || valor < 0) {
      setFormError('El costo unitario debe ser un número mayor o igual a 0');
      return;
    }

    const body: CatalogoItemInput = {
      codigo_tpsns: form.codigo_tpsns.trim(),
      descripcion: form.descripcion.trim(),
      valor_oficial: valor,
      tipo_procedimiento: form.tipo_procedimiento.trim() || undefined,
      nivel: form.nivel.trim() || undefined,
    };

    setGuardando(true);
    try {
      if (modalAbierto === 'editar' && editandoId) {
        await api.actualizarCatalogoItem(editandoId, body);
      } else {
        await api.crearCatalogoItem(body);
      }
      setModalAbierto(null);
      load(q, page);
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setGuardando(false);
    }
  }

  async function onEliminar(item: CatalogoItem) {
    const ok = window.confirm(
      `¿Eliminar el código "${item.codigoTpsns}" (${item.descripcion}) del catálogo? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    try {
      await api.eliminarCatalogoItem(item.id);
      load(q, page);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    importar(file);
  }

  async function importar(file: File) {
    setImportando(true);
    setErrorImportacion(null);
    setResultadoImportacion(null);
    try {
      const resultado = await api.importarCatalogo(file);
      setResultadoImportacion(resultado);
      load(q, 1);
      setPage(1);
    } catch (err) {
      setErrorImportacion(apiErrorMessage(err));
    } finally {
      setImportando(false);
    }
  }

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de tarifas</h1>
          <p className="page-subtitle">
            Códigos, nombres y costo unitario oficial. Esta es la base contra la que se valida cada
            planilla — mantenerla completa y actualizada ayuda a que el sistema detecte y corrija más
            códigos digitados incorrectamente.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importando}>
            {importando ? <span className="spinner" /> : <UploadIcon size={16} />}
            Cargar catálogo (.xlsx)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xlsm"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <button className="btn btn-primary" onClick={abrirCrear}>
            + Nuevo código
          </button>
        </div>
      </div>

      {errorImportacion && <div className="alert alert-error">{errorImportacion}</div>}

      {resultadoImportacion && (
        <div className="alert alert-success" style={{ marginBottom: 18 }}>
          <div>
            Archivo procesado: <strong>{resultadoImportacion.totalFilas}</strong> fila(s) leídas —{' '}
            <strong>{resultadoImportacion.nuevos}</strong> código(s) nuevo(s),{' '}
            <strong>{resultadoImportacion.actualizados}</strong> actualizado(s) con el valor del archivo.
            Los códigos que ya tenías y no vinieron en el archivo no se tocaron.
          </div>
          {resultadoImportacion.errores.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer' }}>
                {resultadoImportacion.errores.length} fila(s) con errores (clic para ver)
              </summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {resultadoImportacion.errores.slice(0, 50).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {resultadoImportacion.errores.length > 50 && (
                  <li>… y {resultadoImportacion.errores.length - 50} más</li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}

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
            placeholder="Buscar por código o nombre…"
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
            <span className="spinner" /> Cargando catálogo…
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">No se encontraron códigos en el catálogo.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre / descripción</th>
                  <th>Tipo</th>
                  <th>Nivel</th>
                  <th style={{ textAlign: 'right' }}>Costo unitario</th>
                  <th>Actualizado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.codigoTpsns}</td>
                    <td>{item.descripcion}</td>
                    <td className="text-muted">{item.tipoProcedimiento ?? '—'}</td>
                    <td className="text-muted">{item.nivel ?? '—'}</td>
                    <td className="money" style={{ textAlign: 'right' }}>
                      {formatMoneyPreciso(item.valorOficial)}
                    </td>
                    <td className="text-muted">{formatDateTime(item.actualizadoEn)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px' }}
                          onClick={() => abrirEditar(item)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '4px 10px', color: 'var(--color-danger)' }}
                          onClick={() => onEliminar(item)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="pagination">
            <span>
              {total} código(s) en total — página {page} de {totalPaginas}
            </span>
            <div className="pagination-controls">
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px' }}
                disabled={page >= totalPaginas}
                onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="card card-pad modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalAbierto === 'editar' ? 'Editar código' : 'Nuevo código de catálogo'}
              </h2>
              <button className="modal-close" onClick={cerrarModal} aria-label="Cerrar">
                ×
              </button>
            </div>
            <form onSubmit={onSubmitForm}>
              {formError && <div className="alert alert-error">{formError}</div>}
              <div className="field">
                <label htmlFor="codigo_tpsns">Código (TPSNS)</label>
                <input
                  id="codigo_tpsns"
                  type="text"
                  value={form.codigo_tpsns}
                  onChange={(e) => setForm((f) => ({ ...f, codigo_tpsns: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="descripcion">Nombre / descripción</label>
                <input
                  id="descripcion"
                  type="text"
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="valor_oficial">Costo unitario oficial</label>
                <input
                  id="valor_oficial"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej. 8.71 o 0.0138"
                  value={form.valor_oficial}
                  onChange={(e) => setForm((f) => ({ ...f, valor_oficial: e.target.value }))}
                  required
                />
                <span className="field-hint">Admite hasta 4 decimales para insumos de bajo costo.</span>
              </div>
              <div className="field">
                <label htmlFor="tipo_procedimiento">Tipo de procedimiento (opcional)</label>
                <input
                  id="tipo_procedimiento"
                  type="text"
                  placeholder="Ej. CONSULTA, INSUMO/MEDICAMENTO"
                  value={form.tipo_procedimiento}
                  onChange={(e) => setForm((f) => ({ ...f, tipo_procedimiento: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="nivel">Nivel (opcional)</label>
                <input
                  id="nivel"
                  type="text"
                  placeholder="Ej. I, II, III"
                  value={form.nivel}
                  onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))}
                />
              </div>
              <div className="wizard-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal} disabled={guardando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? <span className="spinner" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

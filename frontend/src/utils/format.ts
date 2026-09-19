// Formato monetario ecuatoriano para los documentos imprimibles: "$ 8,71" (coma decimal).
export function formatMoney(value: number | null | undefined, withSymbol = true): string {
  const n = value ?? 0;
  const formatted = n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return withSymbol ? `$ ${formatted}` : formatted;
}

// Igual que formatMoney pero con hasta 4 decimales, sin redondear a la baja los
// costos unitarios muy pequeños del catálogo real (ej. insumos a $0,0138).
export function formatMoneyPreciso(value: number | null | undefined, withSymbol = true): string {
  const n = value ?? 0;
  const formatted = n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return withSymbol ? `$ ${formatted}` : formatted;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

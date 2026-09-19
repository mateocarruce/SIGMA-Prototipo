import type { EstadoPlanilla, NivelRiesgo } from '../api/types';

export function RiskBadge({ nivel }: { nivel: NivelRiesgo | null | undefined }) {
  if (!nivel) {
    return <span className="badge badge-pendiente">Sin evaluar</span>;
  }
  const cls = `badge badge-${nivel.toLowerCase()}`;
  return (
    <span className={cls}>
      <span className="badge-dot" />
      {nivel}
    </span>
  );
}

const ESTADO_LABEL: Record<EstadoPlanilla, string> = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
};

export function EstadoBadge({ estado }: { estado: EstadoPlanilla }) {
  return <span className={`badge badge-${estado.toLowerCase()}`}>{ESTADO_LABEL[estado]}</span>;
}

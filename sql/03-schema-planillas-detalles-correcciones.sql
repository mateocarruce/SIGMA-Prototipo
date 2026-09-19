-- SIGMA: planillas, detalles_servicios, correcciones_automaticas

CREATE TABLE planillas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    proveedor_id UUID NOT NULL REFERENCES proveedores(id),
    tipo_servicio TEXT NOT NULL,
    mes_ano_prestacion TEXT NOT NULL,
    fecha_carga TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado TEXT NOT NULL CHECK (estado IN ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA')) DEFAULT 'PENDIENTE',
    evaluada_ia BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES usuarios(id)
);

CREATE TABLE detalles_servicios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planilla_id UUID NOT NULL REFERENCES planillas(id),
    codigo_tpsns TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    beneficiario_nombre TEXT NOT NULL,
    beneficiario_identificacion TEXT NOT NULL,
    fecha_servicio DATE NOT NULL,
    cantidad INT NOT NULL,
    valor_unitario_solicitado NUMERIC(10, 2) NOT NULL,
    subtotal_solicitado NUMERIC(10, 2) NOT NULL,
    estado_fila TEXT NOT NULL CHECK (estado_fila IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')) DEFAULT 'PENDIENTE',
    nivel_riesgo TEXT CHECK (nivel_riesgo IN ('BAJO', 'MEDIO', 'ALTO', 'CRITICO')),
    score_riesgo NUMERIC(5, 2),
    shap_factores JSONB
);

CREATE TABLE correcciones_automaticas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    detalle_servicio_id UUID NOT NULL REFERENCES detalles_servicios(id),
    valor_anterior NUMERIC(10, 2) NOT NULL,
    valor_corregido NUMERIC(10, 2) NOT NULL,
    subtotal_anterior NUMERIC(10, 2) NOT NULL,
    subtotal_corregido NUMERIC(10, 2) NOT NULL,
    score_riesgo NUMERIC(5, 2) NOT NULL,
    nivel_riesgo TEXT NOT NULL,
    motivo TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_detalles_servicios_planilla_id ON detalles_servicios(planilla_id);
CREATE INDEX idx_correcciones_automaticas_detalle_id ON correcciones_automaticas(detalle_servicio_id);
CREATE INDEX idx_planillas_estado ON planillas(estado);

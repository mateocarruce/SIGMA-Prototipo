-- SIGMA: usuarios, proveedores, catalogo_tarifas

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('ADMIN', 'AUDITOR', 'DIGITADOR')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL
);

CREATE TABLE catalogo_tarifas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_tpsns TEXT NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    valor_oficial NUMERIC(10, 2) NOT NULL
);

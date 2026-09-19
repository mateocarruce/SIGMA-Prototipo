-- SIGMA: ampliar catalogo_tarifas para poder cargar el catálogo real de códigos
-- (TPSNS de consulta/procedimiento, pero también insumos/medicamentos con códigos
-- largos de hasta 13 dígitos y valores unitarios con más de 2 decimales, p.ej. 0,0138).
--
-- No borra ni toca los 11 códigos de demo cargados por 05-seed-proveedores-catalogo.sql:
-- solo amplía el tipo de columna y agrega columnas nuevas opcionales.

-- valor_oficial pasa de NUMERIC(10,2) a NUMERIC(14,4): con 2 decimales, un costo
-- unitario real de $0.0138 se guardaría como $0.01 (un 28% menos) — inaceptable para
-- insumos/medicamentos de bajo costo unitario. 4 decimales evita esa pérdida.
ALTER TABLE catalogo_tarifas
    ALTER COLUMN valor_oficial TYPE NUMERIC(14, 4);

-- tipo_procedimiento / nivel reflejan las columnas TIPO_PROCEDIMIENTO y NIVEL del
-- catálogo real (ej. 'INSUMO/MEDICAMENTO', 'II'). Nullable porque los 11 códigos de
-- demo no las tienen y no es obligatorio llenarlas al crear un código a mano.
ALTER TABLE catalogo_tarifas
    ADD COLUMN IF NOT EXISTS tipo_procedimiento TEXT,
    ADD COLUMN IF NOT EXISTS nivel TEXT,
    ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now();

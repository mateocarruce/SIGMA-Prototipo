-- SIGMA: planilla de ejemplo PLA-2026-0842 (Hospital General Ambato, AGOSTO 2026, EN_REVISION)
-- con 7 detalles_servicios. Row 1 (Delgado Vallejo Jorge Washington / 1716560089, codigo 99201) es
-- el caso descrito en el contrato: valor_unitario_solicitado 45.00 vs oficial 8.71 (desvío grande).
-- Filas 4 y 6 también tienen desvío para que "Revisar riesgo" tenga varios casos reales que corregir;
-- el resto coincide exactamente con catalogo_tarifas.

INSERT INTO planillas (codigo, proveedor_id, tipo_servicio, mes_ano_prestacion, estado, evaluada_ia, created_by)
SELECT
    'PLA-2026-0842',
    (SELECT id FROM proveedores WHERE nombre = 'Hospital General Ambato'),
    'Consulta Externa',
    'AGOSTO 2026',
    'EN_REVISION',
    false,
    (SELECT id FROM usuarios WHERE email = 'digitador@hospital.gob.ec');

-- Fila 1: Delgado Vallejo Jorge Washington — desvío grande (45.00 vs oficial 8.71)
INSERT INTO detalles_servicios (
    planilla_id, codigo_tpsns, descripcion, beneficiario_nombre, beneficiario_identificacion,
    fecha_servicio, cantidad, valor_unitario_solicitado, subtotal_solicitado
)
SELECT
    (SELECT id FROM planillas WHERE codigo = 'PLA-2026-0842'),
    '99201', 'Consulta médica - Nivel II', 'Delgado Vallejo Jorge Washington', '1716560089',
    '2026-08-04', 1, 45.00, 45.00;

-- Fila 2: coincide con catálogo
INSERT INTO detalles_servicios (
    planilla_id, codigo_tpsns, descripcion, beneficiario_nombre, beneficiario_identificacion,
    fecha_servicio, cantidad, valor_unitario_solicitado, subtotal_solicitado
)
SELECT
    (SELECT id FROM planillas WHERE codigo = 'PLA-2026-0842'),
    '87340', 'Hemograma completo', 'Paredes Núñez Ana Lucía', '1710234567',
    '2026-08-06', 1, 12.50, 12.50;

-- Fila 3: coincide con catálogo
INSERT INTO detalles_servicios (
    planilla_id, codigo_tpsns, descripcion, beneficiario_nombre, beneficiario_identificacion,
    fecha_servicio, cantidad, valor_unitario_solicitado, subtotal_solicitado
)
SELECT
    (SELECT id FROM planillas WHERE codigo = 'PLA-2026-0842'),
    '71020', 'Radiografía de tórax', 'Chasi Guamán Luis Fernando', '1804567890',
    '2026-08-08', 1, 18.00, 18.00;

-- Fila 4: desvío moderado (22.00 vs oficial 19.50)
INSERT INTO detalles_servicios (
    planilla_id, codigo_tpsns, descripcion, beneficiario_nombre, beneficiario_identificacion,
    fecha_servicio, cantidad, valor_unitario_solicitado, subtotal_solicitado
)
SELECT
    (SELECT id FROM planillas WHERE codigo = 'PLA-2026-0842'),
    '99204', 'Consulta médica - Nivel IV', 'Salazar Vega María Elena', '1723456789',
    '2026-08-10', 1, 22.00, 22.00;

-- Fila 5: coincide con catálogo, cantidad 2
INSERT INTO detalles_servicios (
    planilla_id, codigo_tpsns, descripcion, beneficiario_nombre, beneficiario_identificacion,
    fecha_servicio, cantidad, valor_unitario_solicitado, subtotal_solicitado
)
SELECT
    (SELECT id FROM planillas WHERE codigo = 'PLA-2026-0842'),
    '90715', 'Vacuna Tdap', 'Toapanta Chicaiza Pedro Pablo', '1809876543',
    '2026-08-12', 2, 11.00, 22.00;

-- Fila 6: desvío grande (15.00 vs oficial 4.00)
INSERT INTO detalles_servicios (
    planilla_id, codigo_tpsns, descripcion, beneficiario_nombre, beneficiario_identificacion,
    fecha_servicio, cantidad, valor_unitario_solicitado, subtotal_solicitado
)
SELECT
    (SELECT id FROM planillas WHERE codigo = 'PLA-2026-0842'),
    '36415', 'Extracción de sangre venosa', 'Bravo Espinoza Carmen Rosa', '1712345098',
    '2026-08-14', 1, 15.00, 15.00;

-- Fila 7: coincide con catálogo
INSERT INTO detalles_servicios (
    planilla_id, codigo_tpsns, descripcion, beneficiario_nombre, beneficiario_identificacion,
    fecha_servicio, cantidad, valor_unitario_solicitado, subtotal_solicitado
)
SELECT
    (SELECT id FROM planillas WHERE codigo = 'PLA-2026-0842'),
    '85025', 'Biometría hemática', 'Guerrero Mora Diego Alexander', '1798765432',
    '2026-08-18', 1, 7.40, 7.40;

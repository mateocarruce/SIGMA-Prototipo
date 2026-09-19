-- SIGMA: proveedores y catalogo_tarifas semilla

INSERT INTO proveedores (nombre) VALUES
    ('Hospital General Ambato'),
    ('Clínica San Rafael'),
    ('Centro Médico Norte'),
    ('Clínica Vida Sana');

INSERT INTO catalogo_tarifas (codigo_tpsns, descripcion, valor_oficial) VALUES
    ('99201', 'Consulta médica - Nivel II', 8.71),
    ('99213', 'Consulta médica - Nivel I', 6.50),
    ('99204', 'Consulta médica - Nivel IV', 19.50),
    ('87340', 'Hemograma completo', 12.50),
    ('71020', 'Radiografía de tórax', 18.00),
    ('71046', 'Radiografía de columna', 21.00),
    ('90715', 'Vacuna Tdap', 11.00),
    ('80053', 'Panel metabólico básico', 13.20),
    ('36415', 'Extracción de sangre venosa', 4.00),
    ('85025', 'Biometría hemática', 7.40),
    ('99285', 'Consulta de emergencia', 24.00);

-- SIGMA: ampliar precisión de detalles_servicios y correcciones_automaticas
--
-- Motivo: al probar con datos reales de una planilla de emergencia se encontraron
-- cantidades fraccionarias (dosis parciales de medicamentos líquidos, ej. 1.43,
-- 0.715 unidades) que la columna `cantidad INT` rechaza con el error
-- "invalid input syntax for type integer". Además, igual que ya se corrigió en
-- catalogo_tarifas (ver 07-alter-catalogo-tarifas.sql), los valores unitarios
-- reales pueden tener hasta 4 decimales (ej. $0.0351, $12.2475) y NUMERIC(10,2)
-- los trunca/redondea silenciosamente.
--
-- Este script:
--   1. Convierte detalles_servicios.cantidad de INT a NUMERIC(12,4).
--   2. Amplía detalles_servicios.valor_unitario_solicitado y subtotal_solicitado
--      de NUMERIC(10,2) a NUMERIC(14,4).
--   3. Amplía las cuatro columnas de valores en correcciones_automaticas
--      (valor_anterior, valor_corregido, subtotal_anterior, subtotal_corregido)
--      de NUMERIC(10,2) a NUMERIC(14,4), por consistencia con los valores de
--      los que se derivan.
--
-- Seguro de re-ejecutar: ALTER COLUMN ... TYPE no falla si el tipo destino ya
-- es igual o más ancho que los datos existentes.

ALTER TABLE detalles_servicios
    ALTER COLUMN cantidad TYPE NUMERIC(12, 4);

ALTER TABLE detalles_servicios
    ALTER COLUMN valor_unitario_solicitado TYPE NUMERIC(14, 4);

ALTER TABLE detalles_servicios
    ALTER COLUMN subtotal_solicitado TYPE NUMERIC(14, 4);

ALTER TABLE correcciones_automaticas
    ALTER COLUMN valor_anterior TYPE NUMERIC(14, 4);

ALTER TABLE correcciones_automaticas
    ALTER COLUMN valor_corregido TYPE NUMERIC(14, 4);

ALTER TABLE correcciones_automaticas
    ALTER COLUMN subtotal_anterior TYPE NUMERIC(14, 4);

ALTER TABLE correcciones_automaticas
    ALTER COLUMN subtotal_corregido TYPE NUMERIC(14, 4);

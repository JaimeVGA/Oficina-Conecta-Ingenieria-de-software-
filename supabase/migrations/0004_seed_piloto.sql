-- ============================================================================
-- OFICINA CONECTA — MIGRACIÓN 0004: CATÁLOGO CERRADO DE 3 SEDES Y DEPARTAMENTOS
-- Fuente: 502_A_1.pdf p. 10 (CDMX, OAXACA, PUEBLA)
-- ============================================================================

INSERT INTO public.sedes (id, codigo_corto, nombre) VALUES
  ('CDMX',   'CDMX', 'Ciudad de México'),
  ('OAXACA', 'OAX',  'Oaxaca de Juárez'),
  ('PUEBLA', 'PUE',  'Puebla de Zaragoza')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departamentos (sede_id, nombre) VALUES
  ('CDMX',   'Operaciones'),
  ('CDMX',   'Infraestructura'),
  ('OAXACA', 'Logística'),
  ('OAXACA', 'Supervisión Regional'),
  ('PUEBLA', 'Mantenimiento'),
  ('PUEBLA', 'Redes y Soporte')
ON CONFLICT (sede_id, nombre) DO NOTHING;

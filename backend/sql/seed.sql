-- ============================================================
-- FinObras — Datos iniciales
-- NOTA: el hash corresponde a 'finobras2026' con bcrypt rounds=10
-- ============================================================

-- Usuario admin por defecto
-- Password: finobras2026
INSERT INTO usuarios (nombre, email, password, rol)
VALUES (
  'Admin',
  'admin@finobras.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
);

-- Las 10 obras
INSERT INTO obras (nombre, estado) VALUES
  ('La Plata 659',  'activa'),
  ('UATRE',         'activa'),
  ('Mitre 1117',    'activa'),
  ('Cabrera 3742',  'activa'),
  ('Cabrera 3832',  'activa'),
  ('Junín 575',     'activa'),
  ('L.S. Peña',     'activa'),
  ('Alsina 718',    'activa'),
  ('Tucumán 780',   'activa'),
  ('Medrano 1162',  'activa');

-- Parámetros de sistema
INSERT INTO parametros (clave, valor, descripcion) VALUES
  ('tipo_cambio_actual',      '1430', 'ARS por USD — actualizar cada mes'),
  ('tipo_cambio_presupuesto', '1400', 'TC de presupuesto anual'),
  ('email_alertas',           'admin@finobras.com', 'Email que recibe alertas de vencimientos');

-- Mutuos reales
INSERT INTO deuda_mutuos (acreedor, interes_mensual_ars) VALUES
  ('Pablo Barbieri',             591671),
  ('Felipe Llerena',             733671),
  ('Fabián Llerena',            2366671),
  ('Mariano Adba',              2414000),
  ('Rubén Mas',                  307671),
  ('Francisco Lynch',            189329),
  ('Diana Cortese',              253711),
  ('Marcelo Iriarte',           2343000),
  ('Fabio Chirazi',             4307329),
  ('Gerardo Cagnolo',                 0),
  ('Guadalupe Niell',           1183329),
  ('Martín Iriarte',             828329),
  ('Cristina Bernasconi',       1952500),
  ('Germán Lopez Winsauer',     1124171),
  ('Escribanía Baredes',       33133329),
  ('Russoniello',              28400000),
  ('Diana Roveda',               657559);

-- Pagarés reales
INSERT INTO pagares (acreedor, monto_usd, fecha_vencimiento) VALUES
  ('Mariano Maioli',          100000, '2026-05-05'),
  ('Altos de San Jose SA',     50000, '2026-05-05'),
  ('Mariano Maioli',          200000, '2026-05-12'),
  ('Mariano Maioli',          100000, '2026-05-15'),
  ('Florida y Corrientes SA', 100000, '2026-05-15'),
  ('Mariano Maioli',          250000, '2026-05-20'),
  ('Mariano Maioli',          250000, '2026-05-20'),
  ('Mariano Maioli',          100000, '2026-06-08'),
  ('Mariano Maioli',          100000, '2026-06-12'),
  ('Mariano Maioli',          100000, '2026-06-18'),
  ('Mariano Maioli',           50000, '2026-07-15'),
  ('Altos de San Jose SA',    150000, '2026-07-20'),
  ('Mariano Maioli',          300000, '2026-07-24'),
  ('Mariano Maioli',           50000, '2026-07-30'),
  ('Florida y Corrientes SA', 100000, '2026-08-01'),
  ('Mariano Maioli',          100000, '2026-10-02'),
  ('Mariano Maioli',          230000, '2027-01-06');

-- ============================================================
-- FinObras — Schema PostgreSQL
-- ============================================================

CREATE TABLE usuarios (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  email       VARCHAR(100) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,
  rol         VARCHAR(20) DEFAULT 'operador' CHECK (rol IN ('admin','operador','readonly')),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE obras (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL,
  direccion    VARCHAR(200),
  estado       VARCHAR(50) DEFAULT 'activa',
  fecha_inicio DATE,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parametros (
  id          SERIAL PRIMARY KEY,
  clave       VARCHAR(100) UNIQUE NOT NULL,
  valor       VARCHAR(200) NOT NULL,
  descripcion TEXT,
  updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE movimientos (
  id            SERIAL PRIMARY KEY,
  fecha         DATE NOT NULL,
  tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  obra_id       INTEGER REFERENCES obras(id),
  categoria     VARCHAR(100) NOT NULL,
  proveedor     VARCHAR(200),
  importe       NUMERIC(18,2) NOT NULL,
  moneda        VARCHAR(3) DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  tipo_cambio   NUMERIC(10,2) DEFAULT 1,
  importe_ars   NUMERIC(18,2),
  referencia    VARCHAR(100),
  observaciones TEXT,
  usuario_id    INTEGER REFERENCES usuarios(id),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_movs_fecha ON movimientos(fecha);
CREATE INDEX idx_movs_obra  ON movimientos(obra_id);
CREATE INDEX idx_movs_tipo  ON movimientos(tipo);
CREATE INDEX idx_movs_mes   ON movimientos(DATE_TRUNC('month', fecha));

CREATE TABLE deuda_mutuos (
  id                  SERIAL PRIMARY KEY,
  acreedor            VARCHAR(200) NOT NULL,
  capital_usd         NUMERIC(14,2),
  interes_mensual_ars NUMERIC(14,2) NOT NULL DEFAULT 0,
  activo              BOOLEAN DEFAULT TRUE,
  observaciones       TEXT
);

CREATE TABLE pagares (
  id                SERIAL PRIMARY KEY,
  acreedor          VARCHAR(200) NOT NULL,
  monto_usd         NUMERIC(14,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado            VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagado','vencido')),
  observaciones     TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pagares_venc ON pagares(fecha_vencimiento);

CREATE TABLE ventas (
  id              SERIAL PRIMARY KEY,
  obra_id         INTEGER REFERENCES obras(id),
  unidad          VARCHAR(50) NOT NULL,
  fecha_boleto    DATE NOT NULL,
  comprador       VARCHAR(200),
  anticipo_ars    NUMERIC(14,2),
  m2_total        NUMERIC(8,2),
  m2_cubierto     NUMERIC(8,2),
  m2_semicubierto NUMERIC(8,2),
  m2_descubierto  NUMERIC(8,2),
  m2_comercial    NUMERIC(8,2),
  estado          VARCHAR(50) DEFAULT 'anticipo_cobrado',
  observaciones   TEXT
);

-- ============================================================
-- VISTAS PARA POWER BI / REPORTING
-- ============================================================

CREATE VIEW v_movimientos AS
SELECT
  m.id,
  m.fecha,
  m.tipo,
  o.nombre AS obra,
  m.categoria,
  m.proveedor,
  m.importe,
  m.moneda,
  m.tipo_cambio,
  m.importe_ars,
  DATE_TRUNC('month', m.fecha) AS mes,
  DATE_PART('quarter', m.fecha) AS trimestre,
  DATE_PART('year', m.fecha) AS anio,
  u.nombre AS usuario
FROM movimientos m
LEFT JOIN obras o ON m.obra_id = o.id
LEFT JOIN usuarios u ON m.usuario_id = u.id;

CREATE VIEW v_flujo_diario AS
SELECT
  fecha,
  SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE -importe_ars END) AS resultado_dia,
  SUM(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE -importe_ars END))
    OVER (ORDER BY fecha) AS saldo_acumulado
FROM movimientos
GROUP BY fecha
ORDER BY fecha;

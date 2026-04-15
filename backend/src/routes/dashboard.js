const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper: ejecuta una query y devuelve defaultValue si falla en lugar de tirar
async function safeQuery(queryFn, defaultValue) {
  try {
    return await queryFn();
  } catch (err) {
    console.error('[dashboard] query falló, usando default:', err.message);
    return defaultValue;
  }
}

// ── GET /api/dashboard/hoy ────────────────────────────────────
router.get('/hoy', authenticateToken, async (_req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];

    // Cada query es independiente: si falla devuelve cero en lugar de romper todo
    const [saldoRows, hoyRows, mesRows, tcRows, venceRows, ultimosRows, porObraRows] =
      await Promise.all([

        safeQuery(() => db.query(`
          SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE -importe_ars END), 0) AS saldo
          FROM movimientos
        `), { rows: [{ saldo: 0 }] }),

        safeQuery(() => db.query(`
          SELECT
            COALESCE(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE 0 END), 0) AS cobrado_hoy,
            COALESCE(SUM(CASE WHEN tipo='egreso'  THEN importe_ars ELSE 0 END), 0) AS pagado_hoy
          FROM movimientos WHERE fecha = $1
        `, [hoy]), { rows: [{ cobrado_hoy: 0, pagado_hoy: 0 }] }),

        safeQuery(() => db.query(`
          SELECT
            COALESCE(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE 0 END), 0) AS cobrado_mes,
            COALESCE(SUM(CASE WHEN tipo='egreso'  THEN importe_ars ELSE 0 END), 0) AS pagado_mes
          FROM movimientos
          WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
        `), { rows: [{ cobrado_mes: 0, pagado_mes: 0 }] }),

        safeQuery(() => db.query(
          "SELECT valor FROM parametros WHERE clave = 'tipo_cambio_actual'"
        ), { rows: [] }),

        safeQuery(() => db.query(`
          SELECT COUNT(*) AS count, COALESCE(SUM(monto_usd), 0) AS total_usd
          FROM pagares
          WHERE estado = 'pendiente'
            AND fecha_vencimiento >= CURRENT_DATE
            AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days'
        `), { rows: [{ count: '0', total_usd: 0 }] }),

        safeQuery(() => db.query(`
          SELECT m.id, m.fecha, m.tipo, m.categoria, m.proveedor,
                 m.importe, m.moneda, m.importe_ars,
                 o.nombre AS obra_nombre
          FROM movimientos m
          LEFT JOIN obras o ON m.obra_id = o.id
          ORDER BY m.fecha DESC, m.id DESC
          LIMIT 20
        `), { rows: [] }),

        safeQuery(() => db.query(`
          SELECT o.nombre AS obra,
                 COALESCE(SUM(CASE WHEN m.tipo='egreso' THEN m.importe_ars ELSE 0 END), 0) AS egreso_mes
          FROM obras o
          LEFT JOIN movimientos m ON m.obra_id = o.id
            AND DATE_TRUNC('month', m.fecha) = DATE_TRUNC('month', CURRENT_DATE)
          WHERE o.estado = 'activa'
          GROUP BY o.id, o.nombre
          ORDER BY egreso_mes DESC
        `), { rows: [] }),
      ]);

    const tc = tcRows.rows.length ? (parseFloat(tcRows.rows[0].valor) || 1430) : 1430;
    const vence = venceRows.rows[0];
    const cobrado_mes = parseFloat(mesRows.rows[0].cobrado_mes || 0);
    const pagado_mes  = parseFloat(mesRows.rows[0].pagado_mes  || 0);

    res.json({
      saldo_acumulado:     parseFloat(saldoRows.rows[0].saldo || 0),
      cobrado_hoy:         parseFloat(hoyRows.rows[0].cobrado_hoy || 0),
      pagado_hoy:          parseFloat(hoyRows.rows[0].pagado_hoy  || 0),
      cobrado_mes,
      pagado_mes,
      resultado_mes:       cobrado_mes - pagado_mes,
      vence_semana: {
        count:     parseInt(vence.count || '0', 10),
        total_usd: parseFloat(vence.total_usd || 0),
        total_ars: parseFloat(vence.total_usd || 0) * tc,
      },
      ultimos_movimientos: ultimosRows.rows,
      egresos_por_obra:    porObraRows.rows,
    });
  } catch (err) {
    console.error('[dashboard/hoy] error inesperado:', err);
    res.status(500).json({ error: 'Error al cargar dashboard' });
  }
});

// ── GET /api/dashboard/mes?mes=YYYY-MM ────────────────────────
router.get('/mes', authenticateToken, async (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const fechaRef = `${mes}-01`;

    const porObraResult = await db.query(`
      SELECT
        o.nombre AS obra,
        COALESCE(SUM(CASE WHEN m.tipo='egreso'
          AND DATE_TRUNC('month', m.fecha) = DATE_TRUNC('month', $1::date)
          THEN m.importe_ars ELSE 0 END), 0) AS egreso_mes,
        COALESCE(SUM(CASE WHEN m.tipo='egreso' THEN m.importe_ars ELSE 0 END), 0) AS egreso_acumulado
      FROM obras o
      LEFT JOIN movimientos m ON m.obra_id = o.id
      WHERE o.estado = 'activa'
      GROUP BY o.id, o.nombre
      ORDER BY egreso_mes DESC
    `, [fechaRef]);

    const totalesResult = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE 0 END), 0) AS total_ingresos,
        COALESCE(SUM(CASE WHEN tipo='egreso'  THEN importe_ars ELSE 0 END), 0) AS total_egresos,
        COUNT(*) AS cantidad_movimientos
      FROM movimientos
      WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', $1::date)
    `, [fechaRef]);

    res.json({
      por_obra: porObraResult.rows,
      totales: totalesResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar resumen del mes' });
  }
});

// ── GET /api/dashboard/flujo?mes=YYYY-MM ─────────────────────
router.get('/flujo', authenticateToken, async (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7);
    const fechaRef = `${mes}-01`;

    const result = await db.query(`
      WITH dias AS (
        SELECT generate_series(
          DATE_TRUNC('month', $1::date),
          DATE_TRUNC('month', $1::date) + INTERVAL '1 month - 1 day',
          INTERVAL '1 day'
        )::date AS fecha
      ),
      movs AS (
        SELECT
          fecha,
          SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE 0 END) AS entradas,
          SUM(CASE WHEN tipo='egreso'  THEN importe_ars ELSE 0 END) AS salidas
        FROM movimientos
        WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', $1::date)
        GROUP BY fecha
      )
      SELECT
        d.fecha,
        COALESCE(m.entradas, 0) AS entradas,
        COALESCE(m.salidas, 0)  AS salidas,
        COALESCE(m.entradas, 0) - COALESCE(m.salidas, 0) AS resultado,
        SUM(COALESCE(m.entradas, 0) - COALESCE(m.salidas, 0))
          OVER (ORDER BY d.fecha) AS saldo_acumulado_mes
      FROM dias d
      LEFT JOIN movs m ON d.fecha = m.fecha
      ORDER BY d.fecha
    `, [fechaRef]);

    // Saldo acumulado histórico hasta el inicio del mes
    const saldoPrevioResult = await db.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE -importe_ars END), 0) AS saldo
      FROM movimientos
      WHERE fecha < $1::date
    `, [fechaRef]);

    const saldoPrevio = parseFloat(saldoPrevioResult.rows[0].saldo);

    const filas = result.rows.map(row => ({
      ...row,
      saldo_acumulado: saldoPrevio + parseFloat(row.saldo_acumulado_mes || 0),
    }));

    res.json(filas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cargar flujo de fondos' });
  }
});

module.exports = router;

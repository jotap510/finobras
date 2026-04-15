const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/reportes/por-obra?desde=&hasta=
router.get('/por-obra', authenticateToken, async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    const conditions = ['m.tipo = \'egreso\''];
    const params = [];
    let idx = 1;

    if (desde) { conditions.push(`m.fecha >= $${idx++}`); params.push(desde); }
    if (hasta) { conditions.push(`m.fecha <= $${idx++}`); params.push(hasta); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await db.query(`
      SELECT
        o.nombre AS obra,
        m.categoria,
        SUM(m.importe_ars) AS total_ars,
        COUNT(*) AS cantidad
      FROM movimientos m
      LEFT JOIN obras o ON m.obra_id = o.id
      ${where}
      GROUP BY o.nombre, m.categoria
      ORDER BY o.nombre, total_ars DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener reporte por obra' });
  }
});

// GET /api/reportes/resumen-mensual?anio=2026
router.get('/resumen-mensual', authenticateToken, async (req, res) => {
  try {
    const anio = req.query.anio || new Date().getFullYear();

    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', fecha) AS mes,
        SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE 0 END) AS ingresos,
        SUM(CASE WHEN tipo='egreso'  THEN importe_ars ELSE 0 END) AS egresos,
        SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE -importe_ars END) AS resultado
      FROM movimientos
      WHERE DATE_PART('year', fecha) = $1
      GROUP BY DATE_TRUNC('month', fecha)
      ORDER BY mes
    `, [anio]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen mensual' });
  }
});

// GET /api/reportes/deuda-total
router.get('/deuda-total', authenticateToken, async (req, res) => {
  try {
    const tcResult = await db.query("SELECT valor FROM parametros WHERE clave = 'tipo_cambio_actual'");
    const tc = tcResult.rows.length ? parseFloat(tcResult.rows[0].valor) : 1;

    const mutuosResult = await db.query(`
      SELECT
        COUNT(*) AS cantidad,
        SUM(interes_mensual_ars) AS interes_mensual_total,
        SUM(CASE WHEN capital_usd IS NOT NULL THEN capital_usd ELSE 0 END) AS capital_usd_total
      FROM deuda_mutuos WHERE activo = TRUE
    `);

    const pagaresResult = await db.query(`
      SELECT
        COUNT(*) AS cantidad,
        SUM(monto_usd) AS total_usd
      FROM pagares
      WHERE estado = 'pendiente'
    `);

    const m = mutuosResult.rows[0];
    const p = pagaresResult.rows[0];

    res.json({
      mutuos: {
        cantidad: parseInt(m.cantidad, 10),
        interes_mensual_ars: parseFloat(m.interes_mensual_total || 0),
        capital_usd: parseFloat(m.capital_usd_total || 0),
        capital_ars: parseFloat(m.capital_usd_total || 0) * tc,
      },
      pagares: {
        cantidad: parseInt(p.cantidad, 10),
        total_usd: parseFloat(p.total_usd || 0),
        total_ars: parseFloat(p.total_usd || 0) * tc,
      },
      tipo_cambio: tc,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener deuda total' });
  }
});

module.exports = router;

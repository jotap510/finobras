const express = require('express');
const db = require('../db');
const { authenticateToken, requireOperator, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── MUTUOS ────────────────────────────────────────────────────

// GET /api/deuda/mutuos
router.get('/mutuos', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *,
        (SELECT COALESCE(SUM(interes_mensual_ars), 0) FROM deuda_mutuos WHERE activo = TRUE) AS total_interes_mensual
      FROM deuda_mutuos
      ORDER BY activo DESC, acreedor
    `);

    const total = result.rows.reduce((acc, r) => acc + parseFloat(r.interes_mensual_ars || 0), 0);

    res.json({ data: result.rows, total_interes_mensual: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener mutuos' });
  }
});

// POST /api/deuda/mutuos
router.post('/mutuos', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { acreedor, capital_usd, interes_mensual_ars, observaciones } = req.body;
    if (!acreedor) return res.status(400).json({ error: 'El acreedor es requerido' });

    const result = await db.query(
      `INSERT INTO deuda_mutuos (acreedor, capital_usd, interes_mensual_ars, observaciones)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [acreedor, capital_usd || null, interes_mensual_ars || 0, observaciones || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear mutuo' });
  }
});

// PUT /api/deuda/mutuos/:id
router.put('/mutuos/:id', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { acreedor, capital_usd, interes_mensual_ars, activo, observaciones } = req.body;

    const result = await db.query(
      `UPDATE deuda_mutuos SET
        acreedor=$1, capital_usd=$2, interes_mensual_ars=$3, activo=$4, observaciones=$5
       WHERE id=$6 RETURNING *`,
      [acreedor, capital_usd || null, interes_mensual_ars || 0,
       activo !== undefined ? activo : true, observaciones || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Mutuo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar mutuo' });
  }
});

// ── PAGARÉS ───────────────────────────────────────────────────

// GET /api/deuda/pagares
router.get('/pagares', authenticateToken, async (req, res) => {
  try {
    const tcResult = await db.query("SELECT valor FROM parametros WHERE clave = 'tipo_cambio_actual'");
    const tc = tcResult.rows.length ? parseFloat(tcResult.rows[0].valor) : 1;

    const result = await db.query(`
      SELECT *,
        (fecha_vencimiento - CURRENT_DATE) AS dias_a_vencer
      FROM pagares
      ORDER BY fecha_vencimiento ASC
    `);

    const data = result.rows.map(r => ({
      ...r,
      monto_ars: parseFloat(r.monto_usd) * tc,
      dias_a_vencer: parseInt(r.dias_a_vencer, 10),
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener pagarés' });
  }
});

// POST /api/deuda/pagares
router.post('/pagares', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { acreedor, monto_usd, fecha_vencimiento, observaciones } = req.body;

    if (!acreedor || !monto_usd || !fecha_vencimiento) {
      return res.status(400).json({ error: 'acreedor, monto_usd y fecha_vencimiento son requeridos' });
    }
    if (parseFloat(monto_usd) <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
    }

    const result = await db.query(
      `INSERT INTO pagares (acreedor, monto_usd, fecha_vencimiento, observaciones)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [acreedor, parseFloat(monto_usd), fecha_vencimiento, observaciones || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear pagaré' });
  }
});

// PUT /api/deuda/pagares/:id
router.put('/pagares/:id', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { acreedor, monto_usd, fecha_vencimiento, estado, observaciones } = req.body;

    const result = await db.query(
      `UPDATE pagares SET
        acreedor=$1, monto_usd=$2, fecha_vencimiento=$3, estado=$4, observaciones=$5
       WHERE id=$6 RETURNING *`,
      [acreedor, parseFloat(monto_usd), fecha_vencimiento,
       estado || 'pendiente', observaciones || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pagaré no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar pagaré' });
  }
});

// GET /api/deuda/vencimientos?dias=30
router.get('/vencimientos', authenticateToken, async (req, res) => {
  try {
    const dias = parseInt(req.query.dias || '30', 10);

    const tcResult = await db.query("SELECT valor FROM parametros WHERE clave = 'tipo_cambio_actual'");
    const tc = tcResult.rows.length ? parseFloat(tcResult.rows[0].valor) : 1;

    const result = await db.query(`
      SELECT *,
        (fecha_vencimiento - CURRENT_DATE) AS dias_a_vencer
      FROM pagares
      WHERE estado = 'pendiente'
        AND fecha_vencimiento <= CURRENT_DATE + ($1 * INTERVAL '1 day')
      ORDER BY fecha_vencimiento ASC
    `, [dias]);

    const data = result.rows.map(r => ({
      ...r,
      monto_ars: parseFloat(r.monto_usd) * tc,
      dias_a_vencer: parseInt(r.dias_a_vencer, 10),
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener vencimientos' });
  }
});

module.exports = router;

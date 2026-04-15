const express = require('express');
const db = require('../db');
const { authenticateToken, requireOperator } = require('../middleware/auth');

const router = express.Router();

// GET /api/ventas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { obra_id, estado } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (obra_id) { conditions.push(`v.obra_id = $${idx++}`); params.push(obra_id); }
    if (estado)  { conditions.push(`v.estado = $${idx++}`);  params.push(estado); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT v.*, o.nombre AS obra_nombre
       FROM ventas v
       LEFT JOIN obras o ON v.obra_id = o.id
       ${where}
       ORDER BY v.fecha_boleto DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// POST /api/ventas
router.post('/', authenticateToken, requireOperator, async (req, res) => {
  try {
    const {
      obra_id, unidad, fecha_boleto, comprador, anticipo_ars,
      m2_total, m2_cubierto, m2_semicubierto, m2_descubierto, m2_comercial,
      estado, observaciones
    } = req.body;

    if (!obra_id || !unidad || !fecha_boleto) {
      return res.status(400).json({ error: 'obra_id, unidad y fecha_boleto son requeridos' });
    }

    const result = await db.query(
      `INSERT INTO ventas (obra_id, unidad, fecha_boleto, comprador, anticipo_ars,
        m2_total, m2_cubierto, m2_semicubierto, m2_descubierto, m2_comercial, estado, observaciones)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [obra_id, unidad, fecha_boleto, comprador || null, anticipo_ars || null,
       m2_total || null, m2_cubierto || null, m2_semicubierto || null,
       m2_descubierto || null, m2_comercial || null,
       estado || 'anticipo_cobrado', observaciones || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar venta' });
  }
});

// PUT /api/ventas/:id
router.put('/:id', authenticateToken, requireOperator, async (req, res) => {
  try {
    const {
      obra_id, unidad, fecha_boleto, comprador, anticipo_ars,
      m2_total, m2_cubierto, m2_semicubierto, m2_descubierto, m2_comercial,
      estado, observaciones
    } = req.body;

    const result = await db.query(
      `UPDATE ventas SET
        obra_id=$1, unidad=$2, fecha_boleto=$3, comprador=$4, anticipo_ars=$5,
        m2_total=$6, m2_cubierto=$7, m2_semicubierto=$8, m2_descubierto=$9,
        m2_comercial=$10, estado=$11, observaciones=$12
       WHERE id=$13 RETURNING *`,
      [obra_id, unidad, fecha_boleto, comprador || null, anticipo_ars || null,
       m2_total || null, m2_cubierto || null, m2_semicubierto || null,
       m2_descubierto || null, m2_comercial || null,
       estado || 'anticipo_cobrado', observaciones || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
});

module.exports = router;

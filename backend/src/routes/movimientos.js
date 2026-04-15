const express = require('express');
const multer = require('multer');
const db = require('../db');
const { authenticateToken, requireOperator } = require('../middleware/auth');
const { exportMovimientosExcel } = require('../utils/exportExcel');
const { parseCSVBanco } = require('../utils/importCSV');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET /api/movimientos ──────────────────────────────────────
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { obra_id, tipo, categoria, desde, hasta, mes, page = 1, limit = 50 } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (obra_id) { conditions.push(`m.obra_id = $${idx++}`); params.push(obra_id); }
    if (tipo)    { conditions.push(`m.tipo = $${idx++}`);    params.push(tipo); }
    if (categoria) { conditions.push(`m.categoria ILIKE $${idx++}`); params.push(`%${categoria}%`); }
    if (desde)   { conditions.push(`m.fecha >= $${idx++}`);  params.push(desde); }
    if (hasta)   { conditions.push(`m.fecha <= $${idx++}`);  params.push(hasta); }
    if (mes)     {
      // mes en formato YYYY-MM
      conditions.push(`DATE_TRUNC('month', m.fecha) = DATE_TRUNC('month', $${idx++}::date)`);
      params.push(`${mes}-01`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) FROM movimientos m ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    params.push(parseInt(limit, 10));
    params.push(offset);

    const result = await db.query(
      `SELECT m.*, o.nombre AS obra_nombre, u.nombre AS usuario_nombre
       FROM movimientos m
       LEFT JOIN obras o ON m.obra_id = o.id
       LEFT JOIN usuarios u ON m.usuario_id = u.id
       ${where}
       ORDER BY m.fecha DESC, m.id DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      data: result.rows,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// ── POST /api/movimientos ─────────────────────────────────────
router.post('/', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { fecha, tipo, obra_id, categoria, proveedor, importe, moneda, tipo_cambio, referencia, observaciones } = req.body;

    if (!fecha || !tipo || !categoria || !importe) {
      return res.status(400).json({ error: 'fecha, tipo, categoria e importe son requeridos' });
    }
    if (!['ingreso', 'egreso'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser ingreso o egreso' });
    }
    if (parseFloat(importe) <= 0) {
      return res.status(400).json({ error: 'El importe debe ser mayor a cero' });
    }

    const monedaFinal = moneda || 'ARS';
    let tc = parseFloat(tipo_cambio) || 1;
    let importe_ars;

    if (monedaFinal === 'USD') {
      if (!tipo_cambio) {
        // Usar TC actual de parámetros
        const tcResult = await db.query(
          "SELECT valor FROM parametros WHERE clave = 'tipo_cambio_actual'"
        );
        tc = tcResult.rows.length ? parseFloat(tcResult.rows[0].valor) : 1;
      }
      importe_ars = parseFloat(importe) * tc;
    } else {
      importe_ars = parseFloat(importe);
      tc = 1;
    }

    const result = await db.query(
      `INSERT INTO movimientos
        (fecha, tipo, obra_id, categoria, proveedor, importe, moneda, tipo_cambio, importe_ars, referencia, observaciones, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [fecha, tipo, obra_id || null, categoria, proveedor || null,
       parseFloat(importe), monedaFinal, tc, importe_ars,
       referencia || null, observaciones || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear movimiento' });
  }
});

// ── PUT /api/movimientos/:id ──────────────────────────────────
router.put('/:id', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { fecha, tipo, obra_id, categoria, proveedor, importe, moneda, tipo_cambio, referencia, observaciones } = req.body;
    const { id } = req.params;

    if (!fecha || !tipo || !categoria || !importe) {
      return res.status(400).json({ error: 'fecha, tipo, categoria e importe son requeridos' });
    }
    if (parseFloat(importe) <= 0) {
      return res.status(400).json({ error: 'El importe debe ser mayor a cero' });
    }

    const monedaFinal = moneda || 'ARS';
    let tc = parseFloat(tipo_cambio) || 1;
    let importe_ars;

    if (monedaFinal === 'USD') {
      if (!tipo_cambio) {
        const tcResult = await db.query("SELECT valor FROM parametros WHERE clave = 'tipo_cambio_actual'");
        tc = tcResult.rows.length ? parseFloat(tcResult.rows[0].valor) : 1;
      }
      importe_ars = parseFloat(importe) * tc;
    } else {
      importe_ars = parseFloat(importe);
      tc = 1;
    }

    const result = await db.query(
      `UPDATE movimientos SET
        fecha=$1, tipo=$2, obra_id=$3, categoria=$4, proveedor=$5,
        importe=$6, moneda=$7, tipo_cambio=$8, importe_ars=$9,
        referencia=$10, observaciones=$11
       WHERE id=$12
       RETURNING *`,
      [fecha, tipo, obra_id || null, categoria, proveedor || null,
       parseFloat(importe), monedaFinal, tc, importe_ars,
       referencia || null, observaciones || null, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar movimiento' });
  }
});

// ── DELETE /api/movimientos/:id ───────────────────────────────
router.delete('/:id', authenticateToken, requireOperator, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM movimientos WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Movimiento no encontrado' });
    res.json({ message: 'Movimiento eliminado', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar movimiento' });
  }
});

// ── POST /api/movimientos/import-csv ─────────────────────────
router.post('/import-csv', authenticateToken, requireOperator, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo CSV' });

    const contenido = req.file.buffer.toString('utf-8');
    const filas = parseCSVBanco(contenido);

    res.json({
      importados: filas.length,
      filas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar CSV' });
  }
});

// ── POST /api/movimientos/import-csv/confirmar ────────────────
router.post('/import-csv/confirmar', authenticateToken, requireOperator, async (req, res) => {
  try {
    const { filas } = req.body;
    if (!Array.isArray(filas) || filas.length === 0) {
      return res.status(400).json({ error: 'No hay filas para importar' });
    }

    const tcResult = await db.query("SELECT valor FROM parametros WHERE clave = 'tipo_cambio_actual'");
    const tc = tcResult.rows.length ? parseFloat(tcResult.rows[0].valor) : 1;

    let importados = 0;
    for (const fila of filas) {
      if (!fila.fecha || !fila.categoria || !fila.importe) continue;
      const importe = Math.abs(parseFloat(fila.importe));
      const tipo = parseFloat(fila.importe) >= 0 ? 'ingreso' : 'egreso';

      await db.query(
        `INSERT INTO movimientos (fecha, tipo, obra_id, categoria, proveedor, importe, moneda, tipo_cambio, importe_ars, observaciones, usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,'ARS',$7,$8,$9,$10)`,
        [fila.fecha, tipo, fila.obra_id || null, fila.categoria, fila.proveedor || null,
         importe, tc, importe, fila.descripcion || null, req.user.id]
      );
      importados++;
    }

    res.json({ importados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al confirmar importación' });
  }
});

// ── GET /api/movimientos/export ───────────────────────────────
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { desde, hasta, obra_id } = req.query;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (desde)   { conditions.push(`m.fecha >= $${idx++}`); params.push(desde); }
    if (hasta)   { conditions.push(`m.fecha <= $${idx++}`); params.push(hasta); }
    if (obra_id) { conditions.push(`m.obra_id = $${idx++}`); params.push(obra_id); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT m.*, o.nombre AS obra_nombre
       FROM movimientos m
       LEFT JOIN obras o ON m.obra_id = o.id
       ${where}
       ORDER BY m.fecha DESC, m.id DESC`,
      params
    );

    const workbook = await exportMovimientosExcel(result.rows, { desde, hasta });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="finobras-movimientos-${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al exportar Excel' });
  }
});

module.exports = router;

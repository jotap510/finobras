require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rutas API ─────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/movimientos',  require('./routes/movimientos'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/deuda',        require('./routes/deuda'));
app.use('/api/ventas',       require('./routes/ventas'));
app.use('/api/reportes',     require('./routes/reportes'));

// ── Parámetros (ruta directa simple) ─────────────────────────
const db = require('./db');
const { authenticateToken, requireAdmin } = require('./middleware/auth');

const PARAMETROS_DEFAULT = [
  { clave: 'tipo_cambio_actual',      valor: '1430', descripcion: 'ARS por USD — actualizar cada mes' },
  { clave: 'tipo_cambio_presupuesto', valor: '1400', descripcion: 'TC de presupuesto anual' },
  { clave: 'email_alertas',           valor: '',     descripcion: 'Email que recibe alertas de vencimientos' },
];

app.get('/api/parametros', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT clave, valor, descripcion FROM parametros ORDER BY id');
    // Si la tabla existe pero está vacía, devolver defaults igualmente
    res.json(result.rows.length ? result.rows : PARAMETROS_DEFAULT);
  } catch (err) {
    // Tabla no existe o error de DB: devolver defaults en lugar de 500
    console.error('[parametros] DB error, devolviendo defaults:', err.message);
    res.json(PARAMETROS_DEFAULT);
  }
});

app.put('/api/parametros/:clave', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { clave } = req.params;
    const { valor } = req.body;
    if (!valor) return res.status(400).json({ error: 'El campo valor es requerido' });

    const result = await db.query(
      `UPDATE parametros SET valor = $1, updated_at = NOW()
       WHERE clave = $2 RETURNING *`,
      [valor, clave]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Parámetro no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar parámetro' });
  }
});

// Obras (para selects)
app.get('/api/obras', authenticateToken, async (req, res) => {
  try {
    const result = await db.query("SELECT id, nombre, estado FROM obras ORDER BY nombre");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener obras' });
  }
});

app.post('/api/obras', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nombre, direccion, estado, fecha_inicio } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre de la obra es requerido' });
    const result = await db.query(
      'INSERT INTO obras (nombre, direccion, estado, fecha_inicio) VALUES ($1,$2,$3,$4) RETURNING *',
      [nombre, direccion || null, estado || 'activa', fecha_inicio || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear obra' });
  }
});

app.put('/api/obras/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nombre, direccion, estado } = req.body;
    const result = await db.query(
      'UPDATE obras SET nombre=$1, direccion=$2, estado=$3 WHERE id=$4 RETURNING *',
      [nombre, direccion || null, estado || 'activa', req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Obra no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar obra' });
  }
});

// Usuarios (admin)
app.get('/api/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT id, nombre, email, rol, activo, created_at FROM usuarios ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

app.post('/api/usuarios', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son requeridos' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1,$2,$3,$4) RETURNING id, nombre, email, rol, activo',
      [nombre, email, hash, rol || 'operador']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El email ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

app.put('/api/usuarios/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { nombre, rol, activo } = req.body;
    const result = await db.query(
      'UPDATE usuarios SET nombre=$1, rol=$2, activo=$3 WHERE id=$4 RETURNING id, nombre, email, rol, activo',
      [nombre, rol, activo, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Servir frontend en producción ────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// ── Iniciar servidor ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`FinObras backend corriendo en puerto ${PORT}`);
});

// Iniciar cron de alertas — fuera del callback para que un fallo no mate el servidor
try {
  require('./jobs/alertas');
} catch (err) {
  console.error('[alertas] No se pudo iniciar el cron de alertas:', err.message);
}

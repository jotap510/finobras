# FinObras — Sistema Financiero para Desarrolladora Inmobiliaria

Sistema financiero diario que reemplaza el manejo en Excel para una desarrolladora con 10 obras activas.

## Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT + bcrypt
- **Email**: Nodemailer + Gmail SMTP
- **Export**: ExcelJS
- **Jobs**: node-cron

---

## Deploy en Railway (10 pasos)

1. **Crear cuenta** en [railway.app](https://railway.app)

2. **New Project → Deploy from GitHub repo**
   - Subir el código a GitHub primero (`git push`)

3. **Add Plugin → PostgreSQL**
   - Railway crea la DB automáticamente

4. **Variables de entorno** — en el panel de Railway, agregar:
   ```
   DATABASE_URL      → copiar del plugin PostgreSQL (se auto-completa)
   JWT_SECRET        → string largo aleatorio (ej: openssl rand -base64 32)
   JWT_EXPIRY        → 8h
   EMAIL_USER        → tu-cuenta@gmail.com
   EMAIL_PASS        → app-password-de-gmail (no la contraseña normal)
   PORT              → 3001
   NODE_ENV          → production
   FRONTEND_URL      → https://tu-app.railway.app (lo sabés luego del deploy)
   ```

5. **Correr el schema** — conectarse a la DB de Railway:
   ```bash
   # Instalar psql si no lo tenés
   # Obtener la connection string del plugin PostgreSQL en Railway
   psql "postgresql://..." -f backend/sql/schema.sql
   psql "postgresql://..." -f backend/sql/seed.sql
   ```
   > En Windows: usar TablePlus, DBeaver o pgAdmin para ejecutar los .sql

6. **Deploy** — Railway detecta `railway.json` automáticamente.
   El build corre `npm install` y `postinstall` (que buildea el frontend).

7. **Dominios** — en Settings → Domains: generar URL pública.
   Actualizar la variable `FRONTEND_URL` con esa URL.

8. **Probar** — abrir la URL generada:
   - Login: `admin@finobras.com` / `finobras2026`

9. **Cambiar contraseña** del admin desde Configuración → perfil

10. **Configurar Gmail App Password**:
    - Ir a myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de app
    - Crear una para "FinObras"
    - Copiar el código de 16 caracteres como `EMAIL_PASS`

---

## Desarrollo local

```bash
# 1. Instalar dependencias
cd backend && npm install
cd ../frontend && npm install

# 2. Configurar variables de entorno
cd backend && cp .env.example .env
# editar .env con tu conexión local a PostgreSQL

# 3. Crear la DB local
createdb finobras
psql finobras -f backend/sql/schema.sql
psql finobras -f backend/sql/seed.sql

# 4. Correr el backend
cd backend && npm run dev
# → http://localhost:3001

# 5. Correr el frontend (en otra terminal)
cd frontend && npm run dev
# → http://localhost:5173

# Login: admin@finobras.com / finobras2026
```

---

## Estructura

```
finobras/
├── backend/
│   ├── src/
│   │   ├── index.js              ← servidor Express
│   │   ├── db.js                 ← conexión PostgreSQL
│   │   ├── middleware/auth.js    ← validación JWT
│   │   ├── routes/
│   │   │   ├── auth.js           ← login, change-password, me
│   │   │   ├── movimientos.js    ← CRUD + export Excel + import CSV
│   │   │   ├── dashboard.js      ← métricas en tiempo real
│   │   │   ├── deuda.js          ← mutuos y pagarés
│   │   │   ├── ventas.js         ← registro de ventas
│   │   │   └── reportes.js       ← reportes consolidados
│   │   ├── jobs/alertas.js       ← cron 07:00 ARG
│   │   └── utils/
│   │       ├── exportExcel.js    ← exportación con ExcelJS
│   │       └── importCSV.js      ← parse CSV bancario
│   ├── sql/
│   │   ├── schema.sql            ← tablas + índices + vistas Power BI
│   │   └── seed.sql              ← 10 obras, mutuos, pagarés reales
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/
        │   ├── Dashboard.jsx     ← 4 métricas + últimos movs + vencimientos
        │   ├── NuevoMovimiento   ← formulario con USD/ARS
        │   ├── Movimientos       ← tabla paginada + filtros + export
        │   ├── Vencimientos      ← pagarés + mutuos + marcar pagado
        │   ├── PorObra           ← métricas + barras por categoría
        │   ├── FlujoDeFondos     ← tabla diaria + gráfico Recharts
        │   └── Configuracion     ← TC, usuarios, obras (solo admin)
        └── components/
            ├── Navbar
            ├── MetricCard
            ├── MovimientosTable
            └── VencimientosList
```

---

## Roles de usuario

| Rol        | Puede ver | Puede crear/editar | Accede a Config |
|------------|-----------|-------------------|-----------------|
| `admin`    | Todo      | Sí                | Sí              |
| `operador` | Todo      | Sí                | No              |
| `readonly` | Todo      | No                | No              |

---

## Alertas automáticas (cron 07:00 ARG)

Cada día el sistema envía un email con:
- Pagarés **vencidos** sin pagar
- Pagarés que **vencen en los próximos 7 días**
- Resumen operativo del día anterior (cobrado/pagado/saldo)

Configurar destinatario en `parametros.email_alertas`.

---

## Vistas para Power BI

```sql
-- Conectar Power BI directamente a PostgreSQL con:
SELECT * FROM v_movimientos;   -- todos los movimientos con nombres
SELECT * FROM v_flujo_diario;  -- flujo acumulado histórico
```

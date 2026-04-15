const cron = require('node-cron');
const nodemailer = require('nodemailer');
const db = require('../db');

// ── Configuración de transporte de email ──────────────────────
function crearTransporte() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── Formateadores ─────────────────────────────────────────────
function formatARS(n) {
  const abs = Math.abs(n);
  const str = abs.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return n < 0 ? `($${str})` : `$${str}`;
}

function formatUSD(n) {
  return `USD ${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

function formatFecha(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
}

// ── Lógica principal de alertas ───────────────────────────────
async function ejecutarAlertas() {
  try {
    console.log('[alertas] Ejecutando chequeo de vencimientos...');

    // Parámetros
    const params = await db.query('SELECT clave, valor FROM parametros');
    const p = {};
    params.rows.forEach(r => { p[r.clave] = r.valor; });
    const tc = parseFloat(p.tipo_cambio_actual || '1');
    const emailDestino = p.email_alertas || process.env.EMAIL_USER;

    if (!emailDestino) {
      console.warn('[alertas] No hay email configurado, saltando envío');
      return;
    }

    // Pagarés vencidos sin pagar
    const vencidosResult = await db.query(`
      SELECT * FROM pagares
      WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE
      ORDER BY fecha_vencimiento ASC
    `);

    // Pagarés próximos 7 días
    const proximosResult = await db.query(`
      SELECT *,
        (fecha_vencimiento - CURRENT_DATE) AS dias
      FROM pagares
      WHERE estado = 'pendiente'
        AND fecha_vencimiento >= CURRENT_DATE
        AND fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days'
      ORDER BY fecha_vencimiento ASC
    `);

    // Resumen del día anterior
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const ayerStr = ayer.toISOString().split('T')[0];

    const resumenAyer = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE 0 END), 0) AS cobrado,
        COALESCE(SUM(CASE WHEN tipo='egreso'  THEN importe_ars ELSE 0 END), 0) AS pagado
      FROM movimientos WHERE fecha = $1
    `, [ayerStr]);

    const saldoAcum = await db.query(`
      SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN importe_ars ELSE -importe_ars END), 0) AS saldo
      FROM movimientos
    `);

    const vencidos  = vencidosResult.rows;
    const proximos  = proximosResult.rows;
    const cobrado   = parseFloat(resumenAyer.rows[0].cobrado);
    const pagado    = parseFloat(resumenAyer.rows[0].pagado);
    const saldo     = parseFloat(saldoAcum.rows[0].saldo);

    const totalVencidosUSD  = vencidos.reduce((s, r) => s + parseFloat(r.monto_usd), 0);
    const totalProximosUSD  = proximos.reduce((s, r) => s + parseFloat(r.monto_usd), 0);
    const totalComprometido = totalVencidosUSD + totalProximosUSD;

    const fechaHoy = formatFecha(new Date());

    // ── Construir cuerpo del email ────────────────────────────
    let cuerpo = `FinObras | Alerta de vencimientos — ${fechaHoy}\n`;
    cuerpo += `${'='.repeat(55)}\n\n`;

    if (vencidos.length > 0) {
      cuerpo += `PAGARÉS VENCIDOS SIN PAGAR (${vencidos.length}):\n`;
      vencidos.forEach(p => {
        const ars = parseFloat(p.monto_usd) * tc;
        cuerpo += `  - ${p.acreedor} | venció ${formatFecha(p.fecha_vencimiento)} | ${formatUSD(p.monto_usd)} = ${formatARS(ars)}\n`;
      });
      cuerpo += '\n';
    } else {
      cuerpo += `No hay pagarés vencidos sin pagar.\n\n`;
    }

    if (proximos.length > 0) {
      cuerpo += `PRÓXIMOS 7 DÍAS (${proximos.length}):\n`;
      proximos.forEach(p => {
        const ars = parseFloat(p.monto_usd) * tc;
        const dias = parseInt(p.dias, 10);
        const diasStr = dias === 0 ? 'HOY' : `en ${dias} día${dias !== 1 ? 's' : ''}`;
        cuerpo += `  - ${p.acreedor} | vence ${formatFecha(p.fecha_vencimiento)} (${diasStr}) | ${formatUSD(p.monto_usd)} = ${formatARS(ars)}\n`;
      });
      cuerpo += '\n';
    } else {
      cuerpo += `No hay vencimientos en los próximos 7 días.\n\n`;
    }

    if (totalComprometido > 0) {
      cuerpo += `Total comprometido: ${formatUSD(totalComprometido)} = ${formatARS(totalComprometido * tc)}\n\n`;
    }

    cuerpo += `${'─'.repeat(55)}\n`;
    cuerpo += `RESUMEN OPERATIVO — ${formatFecha(ayer)}\n`;
    cuerpo += `  Cobrado ayer:   ${formatARS(cobrado)}\n`;
    cuerpo += `  Pagado ayer:    ${formatARS(pagado)}\n`;
    cuerpo += `  Resultado:      ${formatARS(cobrado - pagado)}\n\n`;
    cuerpo += `SALDO ACUMULADO TOTAL: ${formatARS(saldo)}\n`;
    cuerpo += `TC vigente: $${tc.toLocaleString('es-AR')} ARS/USD\n\n`;
    cuerpo += `— FinObras Sistema Financiero\n`;

    const asunto = `FinObras — ${vencidos.length} vencidos / ${proximos.length} próximos 7 días`;

    // ── Enviar email ──────────────────────────────────────────
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('[alertas] Credenciales de email no configuradas. Cuerpo del email:');
      console.log(cuerpo);
      return;
    }

    const transporter = crearTransporte();
    await transporter.sendMail({
      from: `"FinObras Alertas" <${process.env.EMAIL_USER}>`,
      to: emailDestino,
      subject: asunto,
      text: cuerpo,
    });

    console.log(`[alertas] Email enviado a ${emailDestino}: ${vencidos.length} vencidos, ${proximos.length} próximos`);
  } catch (err) {
    console.error('[alertas] Error al ejecutar alertas:', err);
  }
}

// ── Cron: todos los días a las 07:00 ─────────────────────────
cron.schedule('0 7 * * *', ejecutarAlertas, {
  timezone: 'America/Argentina/Buenos_Aires',
});

console.log('[alertas] Cron de alertas registrado (07:00 ARG)');

module.exports = { ejecutarAlertas };

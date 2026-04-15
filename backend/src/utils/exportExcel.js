const ExcelJS = require('exceljs');

function formatARS(n) {
  if (n === null || n === undefined) return '';
  const abs = Math.abs(n);
  const str = abs.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return parseFloat(n) < 0 ? `(${str})` : str;
}

function formatFecha(date) {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
}

async function exportMovimientosExcel(rows, { desde, hasta } = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FinObras';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Movimientos', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  // ── Encabezados ───────────────────────────────────────────
  sheet.columns = [
    { header: 'ID',           key: 'id',           width: 8 },
    { header: 'Fecha',        key: 'fecha',         width: 13 },
    { header: 'Tipo',         key: 'tipo',          width: 10 },
    { header: 'Obra',         key: 'obra_nombre',   width: 20 },
    { header: 'Categoría',    key: 'categoria',     width: 25 },
    { header: 'Proveedor',    key: 'proveedor',     width: 25 },
    { header: 'Importe',      key: 'importe',       width: 15 },
    { header: 'Moneda',       key: 'moneda',        width: 8 },
    { header: 'TC',           key: 'tipo_cambio',   width: 10 },
    { header: 'Importe ARS',  key: 'importe_ars',   width: 18 },
    { header: 'Referencia',   key: 'referencia',    width: 15 },
    { header: 'Observaciones',key: 'observaciones', width: 35 },
  ];

  // Estilo encabezado
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF4A90D9' } } };
  });
  headerRow.height = 22;

  // ── Filas ─────────────────────────────────────────────────
  let totalIngresos = 0;
  let totalEgresos  = 0;

  rows.forEach((row, i) => {
    const isIngreso = row.tipo === 'ingreso';
    const importe_ars = parseFloat(row.importe_ars || 0);
    if (isIngreso) totalIngresos += importe_ars;
    else           totalEgresos  += importe_ars;

    const dataRow = sheet.addRow({
      id:            row.id,
      fecha:         formatFecha(row.fecha),
      tipo:          row.tipo,
      obra_nombre:   row.obra_nombre || '—',
      categoria:     row.categoria,
      proveedor:     row.proveedor || '',
      importe:       parseFloat(row.importe),
      moneda:        row.moneda,
      tipo_cambio:   parseFloat(row.tipo_cambio),
      importe_ars:   importe_ars,
      referencia:    row.referencia || '',
      observaciones: row.observaciones || '',
    });

    // Colorear por tipo
    const bgColor = isIngreso ? 'FFE8F5E9' : 'FFFCE4EC';
    dataRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? bgColor : 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle' };
    });

    // Formato numérico para importes
    dataRow.getCell('importe').numFmt    = '#,##0.00';
    dataRow.getCell('tipo_cambio').numFmt= '#,##0.00';
    dataRow.getCell('importe_ars').numFmt= '#,##0.00';

    // Color del tipo
    const tipoCell = dataRow.getCell('tipo');
    tipoCell.font = { bold: true, color: { argb: isIngreso ? 'FF2E7D32' : 'FFC62828' } };
  });

  // ── Fila de totales ───────────────────────────────────────
  sheet.addRow({});
  const totalRow = sheet.addRow({
    fecha:       'TOTALES',
    tipo:        '',
    importe_ars: totalIngresos - totalEgresos,
  });
  totalRow.getCell('fecha').font = { bold: true, size: 11 };
  totalRow.getCell('importe_ars').numFmt = '#,##0.00';
  totalRow.getCell('importe_ars').font = {
    bold: true,
    color: { argb: (totalIngresos - totalEgresos) >= 0 ? 'FF2E7D32' : 'FFC62828' },
  };

  const ingresosRow = sheet.addRow({ fecha: '  Ingresos:', importe_ars: totalIngresos });
  ingresosRow.getCell('importe_ars').numFmt = '#,##0.00';
  ingresosRow.getCell('importe_ars').font = { color: { argb: 'FF2E7D32' } };

  const egresosRow = sheet.addRow({ fecha: '  Egresos:', importe_ars: totalEgresos });
  egresosRow.getCell('importe_ars').numFmt = '#,##0.00';
  egresosRow.getCell('importe_ars').font = { color: { argb: 'FFC62828' } };

  // ── Metadata ──────────────────────────────────────────────
  const infoSheet = workbook.addWorksheet('Info');
  infoSheet.addRow(['Exportado por', 'FinObras']);
  infoSheet.addRow(['Fecha de exportación', new Date().toLocaleString('es-AR')]);
  if (desde) infoSheet.addRow(['Desde', desde]);
  if (hasta) infoSheet.addRow(['Hasta', hasta]);
  infoSheet.addRow(['Total registros', rows.length]);

  return workbook;
}

module.exports = { exportMovimientosExcel };

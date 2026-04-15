// Mapeo de palabras clave del banco → nombre de obra en DB
const OBRA_KEYWORDS = [
  { keywords: ['ALSINA'],          obra: 'Alsina 718' },
  { keywords: ['TUCUM', 'TUCUMAN'],obra: 'Tucumán 780' },
  { keywords: ['MEDRAN', 'MEDRANO'],obra: 'Medrano 1162' },
  { keywords: ['JUNIN', 'JUNÍN'],  obra: 'Junín 575' },
  { keywords: ['MITRE'],           obra: 'Mitre 1117' },
  { keywords: ['PLATA', 'LA PLATA'],obra: 'La Plata 659' },
  { keywords: ['CABRERA'],         obra: 'Cabrera 3742' },
  { keywords: ['UATRE'],           obra: 'UATRE' },
  { keywords: ['PENA', 'PEÑA', 'L.S.'],obra: 'L.S. Peña' },
];

function detectarObra(descripcion) {
  if (!descripcion) return null;
  const upper = descripcion.toUpperCase();
  for (const { keywords, obra } of OBRA_KEYWORDS) {
    if (keywords.some(kw => upper.includes(kw))) return obra;
  }
  return null;
}

function detectarCategoria(descripcion, importe) {
  if (!descripcion) return importe >= 0 ? 'Otros ingresos' : 'Varios/Otros';
  const upper = descripcion.toUpperCase();

  if (upper.includes('SUELDO') || upper.includes('PERSONAL') || upper.includes('HONORAR')) {
    return 'Personal/Honorarios';
  }
  if (upper.includes('BANCO') || upper.includes('COMISION') || upper.includes('MANTENIMIENTO')) {
    return 'Gastos bancarios';
  }
  if (upper.includes('SEGURO')) return 'Seguro automotor';
  if (upper.includes('MUTUO') || upper.includes('INTERES')) return 'Mutuo – interés';
  if (upper.includes('PAGARE') || upper.includes('PAGARÉ')) return 'Pagaré';
  if (upper.includes('CHEQUE')) return 'Cheque';
  if (upper.includes('LUZ') || upper.includes('GAS') || upper.includes('AGUA') || upper.includes('EDESUR') || upper.includes('METROGAS')) {
    return 'Servicios (luz/gas/agua)';
  }
  if (upper.includes('HIERRO') || upper.includes('ACINDAR')) return 'Hierros';
  if (upper.includes('HORMIG') || upper.includes('CEMENTO')) return 'Hormigón';
  if (upper.includes('MATERIAL')) return 'Materiales';
  if (upper.includes('FLETE') || upper.includes('VOLQUET')) return 'Fletes y volquetes';
  if (upper.includes('GRUA') || upper.includes('GRÚA')) return 'Grúa';

  return importe >= 0 ? 'Otros ingresos' : 'Varios/Otros';
}

/**
 * Parsea el CSV exportado por un banco argentino típico.
 * Columnas esperadas: Fecha, Descripcion, Importe
 * También maneja variantes: FECHA, CONCEPTO, MONTO
 */
function parseCSVBanco(contenido) {
  const lineas = contenido
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lineas.length < 2) return [];

  // Detectar separador (coma o punto y coma)
  const separador = lineas[0].includes(';') ? ';' : ',';

  const encabezado = lineas[0].split(separador).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Mapear columnas flexiblemente
  const colFecha       = encabezado.findIndex(h => ['fecha', 'date'].includes(h));
  const colDescripcion = encabezado.findIndex(h => ['descripcion', 'descripción', 'concepto', 'detalle', 'description'].includes(h));
  const colImporte     = encabezado.findIndex(h => ['importe', 'monto', 'amount', 'credito', 'crédito', 'debito', 'débito'].includes(h));

  if (colFecha < 0 || colImporte < 0) {
    throw new Error('El CSV no tiene las columnas esperadas (Fecha, Descripcion, Importe)');
  }

  const filas = [];

  for (let i = 1; i < lineas.length; i++) {
    const cols = lineas[i].split(separador).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length < 2) continue;

    const fechaRaw      = cols[colFecha]      || '';
    const descripcion   = cols[colDescripcion >= 0 ? colDescripcion : -1] || '';
    const importeRaw    = cols[colImporte]    || '';

    // Normalizar fecha: puede venir DD/MM/YYYY o YYYY-MM-DD
    let fecha = null;
    if (fechaRaw.includes('/')) {
      const partes = fechaRaw.split('/');
      if (partes.length === 3) {
        // Detectar formato DD/MM/YYYY vs MM/DD/YYYY
        const [a, b, c] = partes;
        if (c.length === 4) {
          fecha = `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`; // DD/MM/YYYY → YYYY-MM-DD
        } else {
          fecha = fechaRaw; // ya en YYYY/MM/DD
        }
      }
    } else if (fechaRaw.includes('-')) {
      fecha = fechaRaw.slice(0, 10); // tomar solo YYYY-MM-DD
    }

    if (!fecha) continue;

    // Normalizar importe: puede tener puntos/comas como separadores
    const importeNorm = importeRaw
      .replace(/\./g, '')   // quitar separador de miles
      .replace(',', '.')    // coma decimal → punto
      .replace(/[^0-9.\-]/g, '');

    const importe = parseFloat(importeNorm);
    if (isNaN(importe)) continue;

    const obraDetectada    = detectarObra(descripcion);
    const categoriaAuto    = detectarCategoria(descripcion, importe);

    filas.push({
      fecha,
      descripcion,
      importe,
      tipo:       importe >= 0 ? 'ingreso' : 'egreso',
      obra_nombre: obraDetectada,
      categoria:  categoriaAuto,
      proveedor:  descripcion.slice(0, 100),
    });
  }

  return filas;
}

module.exports = { parseCSVBanco, detectarObra, detectarCategoria };

import { formatARS, formatFecha } from '../api.js';

export default function MovimientosTable({ rows = [], loading = false, onDelete }) {
  if (loading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Fecha','Tipo','Obra','Categoría','Proveedor','Importe ARS'].map(h => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="td">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">Sin movimientos</p>
        <p className="text-sm mt-1">No hay registros para los filtros seleccionados</p>
      </div>
    );
  }

  const totalIngresos = rows.reduce((s, r) => r.tipo === 'ingreso' ? s + parseFloat(r.importe_ars || 0) : s, 0);
  const totalEgresos  = rows.reduce((s, r) => r.tipo === 'egreso'  ? s + parseFloat(r.importe_ars || 0) : s, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="th">Fecha</th>
            <th className="th">Tipo</th>
            <th className="th">Obra</th>
            <th className="th">Categoría</th>
            <th className="th">Proveedor</th>
            <th className="th text-right">Importe ARS</th>
            {onDelete && <th className="th" />}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              <td className="td font-mono text-xs">{formatFecha(row.fecha)}</td>
              <td className="td">
                <span className={row.tipo === 'ingreso' ? 'badge-ingreso' : 'badge-egreso'}>
                  {row.tipo}
                </span>
              </td>
              <td className="td">{row.obra_nombre || '—'}</td>
              <td className="td">{row.categoria}</td>
              <td className="td text-gray-500">{row.proveedor || '—'}</td>
              <td className={`td text-right font-medium font-mono ${row.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                {row.moneda === 'USD'
                  ? <span title={`USD ${parseFloat(row.importe).toLocaleString('es-AR')}`}>{formatARS(row.importe_ars)}</span>
                  : formatARS(row.importe_ars)
                }
              </td>
              {onDelete && (
                <td className="td">
                  <button
                    onClick={() => onDelete(row.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Eliminar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
          <tr>
            <td colSpan={onDelete ? 5 : 5} className="td font-semibold text-gray-600">Totales</td>
            <td className="td text-right font-bold font-mono">
              <div className="text-green-700 text-xs">{formatARS(totalIngresos)}</div>
              <div className="text-red-700 text-xs">({formatARS(totalEgresos)})</div>
              <div className={`${(totalIngresos - totalEgresos) >= 0 ? 'text-green-800' : 'text-red-800'} font-bold`}>
                {formatARS(totalIngresos - totalEgresos)}
              </div>
            </td>
            {onDelete && <td />}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

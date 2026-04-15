import { formatARS, formatUSD, formatFecha } from '../api.js';

function badgeVencimiento(dias) {
  if (dias < 0)  return <span className="badge-urgente">VENCIDO</span>;
  if (dias === 0) return <span className="badge-urgente">HOY</span>;
  if (dias <= 7)  return <span className="badge-urgente">URGENTE</span>;
  if (dias <= 15) return <span className="badge-proximo">PRÓXIMO</span>;
  return <span className="badge-ok">OK</span>;
}

export default function VencimientosList({ items = [], loading = false, tc = 1, onMarcarPagado }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        No hay vencimientos próximos
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map(item => {
        const dias = parseInt(item.dias_a_vencer, 10);
        const monto_ars = parseFloat(item.monto_usd) * tc;

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              dias <= 7 ? 'border-red-200 bg-red-50' :
              dias <= 15 ? 'border-orange-200 bg-orange-50' :
              'border-gray-200 bg-white'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {badgeVencimiento(dias)}
                <span className="text-sm font-medium text-gray-800 truncate">{item.acreedor}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {formatFecha(item.fecha_vencimiento)}
                {dias > 0 && ` · en ${dias} día${dias !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="text-right ml-3 shrink-0">
              <div className="text-sm font-bold text-gray-800">{formatUSD(item.monto_usd)}</div>
              <div className="text-xs text-gray-500">{formatARS(monto_ars)}</div>
            </div>
            {onMarcarPagado && item.estado !== 'pagado' && (
              <button
                onClick={() => onMarcarPagado(item.id)}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
              >
                Pagar ✓
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

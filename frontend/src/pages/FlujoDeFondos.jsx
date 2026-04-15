import { useState, useEffect } from 'react';
import { dashboard, formatARS, mesActual } from '../api.js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';

function formatFechaCorta(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}

function TooltipCustom({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="font-mono">{formatARS(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function FlujoDeFondos() {
  const [mes, setMes] = useState(mesActual());
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargar();
  }, [mes]);

  async function cargar() {
    setLoading(true);
    setError('');
    try {
      const data = await dashboard.flujo(mes);
      setFilas(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalEntradas = filas.reduce((s, r) => s + parseFloat(r.entradas || 0), 0);
  const totalSalidas  = filas.reduce((s, r) => s + parseFloat(r.salidas  || 0), 0);
  const resultado     = totalEntradas - totalSalidas;
  const ultimoSaldo   = filas.length ? parseFloat(filas[filas.length - 1].saldo_acumulado || 0) : 0;

  // Datos para el gráfico — sólo días con movimiento y días relevantes
  const chartData = filas.map(row => ({
    fecha:    formatFechaCorta(row.fecha),
    Entradas: parseFloat(row.entradas || 0),
    Salidas:  parseFloat(row.salidas  || 0),
    'Saldo acumulado': parseFloat(row.saldo_acumulado || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Flujo de fondos</h1>
        <input
          type="month"
          className="input w-36 text-sm"
          value={mes}
          onChange={e => setMes(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Resumen del mes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total entradas',    value: totalEntradas, color: 'text-green-700' },
          { label: 'Total salidas',     value: totalSalidas,  color: 'text-red-700' },
          { label: 'Resultado del mes', value: resultado,     color: resultado >= 0 ? 'text-green-700' : 'text-red-700' },
          { label: 'Saldo acumulado',   value: ultimoSaldo,   color: ultimoSaldo >= 0 ? 'text-green-800' : 'text-red-800' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card py-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold mt-1 font-mono ${color}`}>
              {loading ? '...' : formatARS(value)}
            </p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {!loading && filas.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Saldo acumulado en el mes</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={v => `$${(v / 1000000).toFixed(0)}M`}
                  width={60}
                />
                <Tooltip content={<TooltipCustom />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="Saldo acumulado"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Entradas"
                  stroke="#16a34a"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="Salidas"
                  stroke="#dc2626"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabla diaria */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Detalle diario</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Fecha</th>
                <th className="th text-right">Entradas</th>
                <th className="th text-right">Salidas</th>
                <th className="th text-right">Resultado del día</th>
                <th className="th text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="td"><div className="h-4 bg-gray-200 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : filas.map(row => {
                const resultado = parseFloat(row.resultado || 0);
                const saldo = parseFloat(row.saldo_acumulado || 0);
                const tieneMovs = parseFloat(row.entradas || 0) > 0 || parseFloat(row.salidas || 0) > 0;

                return (
                  <tr
                    key={row.fecha}
                    className={tieneMovs ? '' : 'text-gray-300'}
                  >
                    <td className="td font-mono text-xs">
                      {formatFechaCorta(row.fecha)}
                    </td>
                    <td className="td text-right font-mono text-green-700">
                      {parseFloat(row.entradas || 0) > 0 ? formatARS(row.entradas) : '—'}
                    </td>
                    <td className="td text-right font-mono text-red-700">
                      {parseFloat(row.salidas || 0) > 0 ? formatARS(row.salidas) : '—'}
                    </td>
                    <td className={`td text-right font-mono ${resultado > 0 ? 'text-green-700' : resultado < 0 ? 'text-red-700' : 'text-gray-400'}`}>
                      {tieneMovs ? formatARS(resultado) : '—'}
                    </td>
                    <td className={`td text-right font-mono font-medium ${saldo >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                      {formatARS(saldo)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {!loading && (
              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <tr>
                  <td className="td">Total del mes</td>
                  <td className="td text-right font-mono text-green-700">{formatARS(totalEntradas)}</td>
                  <td className="td text-right font-mono text-red-700">{formatARS(totalSalidas)}</td>
                  <td className={`td text-right font-mono ${resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatARS(resultado)}</td>
                  <td className={`td text-right font-mono ${ultimoSaldo >= 0 ? 'text-blue-800' : 'text-red-800'}`}>{formatARS(ultimoSaldo)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

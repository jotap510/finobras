import { useState, useEffect } from 'react';
import { obras, movimientos, formatARS, mesActual } from '../api.js';
import MetricCard from '../components/MetricCard.jsx';
import MovimientosTable from '../components/MovimientosTable.jsx';

export default function PorObra() {
  const [obrasList, setObrasList] = useState([]);
  const [obraId, setObraId] = useState('');
  const [mesFiltro, setMesFiltro] = useState(mesActual());
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    obras.listar().then(list => {
      setObrasList(list);
      if (list.length) setObraId(String(list[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!obraId) return;
    cargar();
  }, [obraId, mesFiltro]);

  async function cargar() {
    setLoading(true);
    try {
      const result = await movimientos.listar({
        obra_id: obraId,
        mes: mesFiltro,
        limit: 200,
      });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const rows = data.data || [];
  const egresoTotal = rows.filter(r => r.tipo === 'egreso').reduce((s, r) => s + parseFloat(r.importe_ars || 0), 0);
  const ingresoTotal = rows.filter(r => r.tipo === 'ingreso').reduce((s, r) => s + parseFloat(r.importe_ars || 0), 0);

  // Resumen por categoría
  const porCategoria = rows
    .filter(r => r.tipo === 'egreso')
    .reduce((acc, r) => {
      acc[r.categoria] = (acc[r.categoria] || 0) + parseFloat(r.importe_ars || 0);
      return acc;
    }, {});
  const categoriasSorted = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...categoriasSorted.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Movimientos por obra</h1>

      {/* Selectores */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label text-xs">Obra</label>
            <select
              className="input w-48 text-sm"
              value={obraId}
              onChange={e => setObraId(e.target.value)}
            >
              {obrasList.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Mes</label>
            <input
              type="month" className="input w-36 text-sm"
              value={mesFiltro}
              onChange={e => setMesFiltro(e.target.value)}
            />
          </div>
          <button
            onClick={() => setMesFiltro('')}
            className="btn-secondary text-sm"
          >
            Ver todo
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Egresos del período"
          value={formatARS(egresoTotal)}
          color="red"
          loading={loading}
        />
        <MetricCard
          title="Ingresos del período"
          value={formatARS(ingresoTotal)}
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Movimientos"
          value={rows.length}
          subtitle="registros encontrados"
          color="blue"
          loading={loading}
        />
      </div>

      {/* Barras por categoría */}
      {!loading && categoriasSorted.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Egresos por categoría</h2>
          <div className="space-y-2">
            {categoriasSorted.map(([cat, val]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-40 truncate shrink-0">{cat}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${(val / maxCat) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-700 w-28 text-right shrink-0">{formatARS(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Detalle de movimientos</h2>
        <MovimientosTable rows={rows} loading={loading} />
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { movimientos, obras, mesActual } from '../api.js';
import MovimientosTable from '../components/MovimientosTable.jsx';

export default function Movimientos() {
  const [obrasList, setObrasList] = useState([]);
  const [filtros, setFiltros] = useState({
    obra_id: '',
    tipo: '',
    mes: mesActual(),
    page: 1,
    limit: 50,
  });
  const [data, setData] = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    obras.listar().then(setObrasList).catch(() => {});
  }, []);

  useEffect(() => {
    buscar();
  }, [filtros.page]);

  async function buscar(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await movimientos.listar(filtros);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await movimientos.eliminar(id);
      buscar();
    } catch (err) {
      alert(err.message);
    }
  }

  function handleExport() {
    movimientos.exportar({
      desde: filtros.desde,
      hasta: filtros.hasta,
      obra_id: filtros.obra_id,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Movimientos</h1>
        <button onClick={handleExport} className="btn-secondary text-sm">
          Exportar Excel ↓
        </button>
      </div>

      {/* Filtros */}
      <form onSubmit={buscar} className="card py-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">Obra</label>
            <select
              className="input w-44 text-sm"
              value={filtros.obra_id}
              onChange={e => setFiltros(p => ({ ...p, obra_id: e.target.value, page: 1 }))}
            >
              <option value="">Todas las obras</option>
              {obrasList.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Tipo</label>
            <select
              className="input w-32 text-sm"
              value={filtros.tipo}
              onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value, page: 1 }))}
            >
              <option value="">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
          <div>
            <label className="label text-xs">Mes</label>
            <input
              type="month"
              className="input w-36 text-sm"
              value={filtros.mes}
              onChange={e => setFiltros(p => ({ ...p, mes: e.target.value, page: 1 }))}
            />
          </div>
          <button type="submit" className="btn-primary text-sm">
            Buscar
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => {
              setFiltros({ obra_id: '', tipo: '', mes: '', page: 1, limit: 50 });
            }}
          >
            Limpiar
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <MovimientosTable rows={data.data} loading={loading} onDelete={handleDelete} />

      {/* Paginación */}
      {data.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{data.total} registros · página {data.page} de {data.pages}</span>
          <div className="flex gap-2">
            <button
              disabled={data.page <= 1}
              onClick={() => setFiltros(p => ({ ...p, page: p.page - 1 }))}
              className="btn-secondary disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              disabled={data.page >= data.pages}
              onClick={() => setFiltros(p => ({ ...p, page: p.page + 1 }))}
              className="btn-secondary disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { deuda, parametros, formatARS, formatUSD, formatFecha } from '../api.js';
import VencimientosList from '../components/VencimientosList.jsx';

export default function Vencimientos() {
  const [pagares, setPagares] = useState([]);
  const [mutuos, setMutuos] = useState([]);
  const [tc, setTc] = useState(1430);
  const [diasFiltro, setDiasFiltro] = useState(30);
  const [loading, setLoading] = useState(true);
  const [editingMutuo, setEditingMutuo] = useState(null);
  const [showNuevoPagare, setShowNuevoPagare] = useState(false);
  const [formPagare, setFormPagare] = useState({ acreedor: '', monto_usd: '', fecha_vencimiento: '', observaciones: '' });
  const [savingPagare, setSavingPagare] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function cargar() {
    setLoading(true);
    try {
      const [pag, mut, params] = await Promise.all([
        deuda.pagares.listar(),
        deuda.mutuos.listar(),
        parametros.listar(),
      ]);
      setPagares(pag);
      setMutuos(mut.data || []);
      const tcParam = params.find(p => p.clave === 'tipo_cambio_actual');
      if (tcParam) setTc(parseFloat(tcParam.valor));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function marcarPagado(id) {
    const p = pagares.find(x => x.id === id);
    if (!p || !confirm(`¿Marcar como pagado el pagaré de ${p.acreedor}?`)) return;
    try {
      await deuda.pagares.actualizar(id, {
        acreedor: p.acreedor,
        monto_usd: p.monto_usd,
        fecha_vencimiento: p.fecha_vencimiento,
        estado: 'pagado',
      });
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  async function guardarPagare(e) {
    e.preventDefault();
    setSavingPagare(true);
    setErrorMsg('');
    try {
      await deuda.pagares.crear(formPagare);
      setShowNuevoPagare(false);
      setFormPagare({ acreedor: '', monto_usd: '', fecha_vencimiento: '', observaciones: '' });
      cargar();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingPagare(false);
    }
  }

  // Filtrar pagarés según días seleccionados
  const hoy = new Date();
  const pagaresVisibles = diasFiltro === 0
    ? pagares
    : pagares.filter(p => {
        const dias = parseInt(p.dias_a_vencer, 10);
        return dias <= diasFiltro;
      });

  const pendientes = pagaresVisibles.filter(p => p.estado === 'pendiente');
  const pagados    = pagaresVisibles.filter(p => p.estado === 'pagado');
  const totalPendienteUSD = pendientes.reduce((s, p) => s + parseFloat(p.monto_usd), 0);
  const totalMutuoMensual = mutuos.filter(m => m.activo).reduce((s, m) => s + parseFloat(m.interes_mensual_ars || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Vencimientos y Deuda</h1>

      {/* ── PAGARÉS ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Pagarés</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} ·&nbsp;
              {formatUSD(totalPendienteUSD)} = {formatARS(totalPendienteUSD * tc)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filtro días */}
            <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
              {[
                { label: '7d',  value: 7 },
                { label: '30d', value: 30 },
                { label: '60d', value: 60 },
                { label: 'Todos', value: 0 },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setDiasFiltro(value)}
                  className={`px-3 py-1.5 transition-colors ${
                    diasFiltro === value ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNuevoPagare(true)} className="btn-primary text-sm">
              + Agregar
            </button>
          </div>
        </div>

        {/* Formulario nuevo pagaré */}
        {showNuevoPagare && (
          <form onSubmit={guardarPagare} className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-blue-900">Nuevo pagaré</h3>
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Acreedor *</label>
                <input className="input text-sm" required value={formPagare.acreedor}
                  onChange={e => setFormPagare(p => ({...p, acreedor: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Monto USD *</label>
                <input type="number" min="1" step="1" className="input text-sm" required
                  value={formPagare.monto_usd}
                  onChange={e => setFormPagare(p => ({...p, monto_usd: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Vencimiento *</label>
                <input type="date" className="input text-sm" required
                  value={formPagare.fecha_vencimiento}
                  onChange={e => setFormPagare(p => ({...p, fecha_vencimiento: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Observaciones</label>
                <input className="input text-sm" value={formPagare.observaciones}
                  onChange={e => setFormPagare(p => ({...p, observaciones: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingPagare} className="btn-primary text-sm">
                {savingPagare ? 'Guardando...' : 'Guardar'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowNuevoPagare(false)}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Tabla de pagarés */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Acreedor</th>
                <th className="th">Vencimiento</th>
                <th className="th text-right">USD</th>
                <th className="th text-right">ARS (TC {tc.toLocaleString('es-AR')})</th>
                <th className="th text-center">Días</th>
                <th className="th text-center">Estado</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="td"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : pagaresVisibles.length === 0 ? (
                <tr><td colSpan={7} className="td text-center text-gray-400 py-6">Sin pagarés</td></tr>
              ) : (
                pagaresVisibles.map(p => {
                  const dias = parseInt(p.dias_a_vencer, 10);
                  const monto_ars = parseFloat(p.monto_usd) * tc;
                  return (
                    <tr key={p.id} className={
                      p.estado === 'pagado' ? 'opacity-50' :
                      dias < 0 ? 'bg-red-50' :
                      dias <= 7 ? 'bg-orange-50' : ''
                    }>
                      <td className="td font-medium">{p.acreedor}</td>
                      <td className="td font-mono text-xs">{formatFecha(p.fecha_vencimiento)}</td>
                      <td className="td text-right font-mono">{formatUSD(p.monto_usd)}</td>
                      <td className="td text-right font-mono">{formatARS(monto_ars)}</td>
                      <td className="td text-center">
                        {dias < 0
                          ? <span className="badge-urgente">{Math.abs(dias)}d vencido</span>
                          : <span className={dias <= 7 ? 'font-bold text-red-700' : 'text-gray-600'}>{dias}d</span>
                        }
                      </td>
                      <td className="td text-center">
                        <span className={
                          p.estado === 'pagado' ? 'badge-pagado' :
                          dias < 0 ? 'badge-urgente' :
                          dias <= 7 ? 'badge-proximo' : 'badge-ok'
                        }>
                          {p.estado === 'pagado' ? 'Pagado' : dias < 0 ? 'Vencido' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="td">
                        {p.estado === 'pendiente' && (
                          <button
                            onClick={() => marcarPagado(p.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Marcar pagado
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MUTUOS ──────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Mutuos — Interés mensual</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Total mensual: {formatARS(totalMutuoMensual)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Acreedor</th>
                <th className="th text-right">Interés mensual ARS</th>
                <th className="th text-center">Estado</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(4)].map((_, j) => <td key={j} className="td"><div className="h-4 bg-gray-200 rounded" /></td>)}
                  </tr>
                ))
              ) : mutuos.length === 0 ? (
                <tr><td colSpan={4} className="td text-center text-gray-400 py-6">Sin mutuos</td></tr>
              ) : (
                mutuos.map(m => (
                  <tr key={m.id} className={!m.activo ? 'opacity-40' : ''}>
                    <td className="td font-medium">{m.acreedor}</td>
                    <td className="td text-right font-mono">{formatARS(m.interes_mensual_ars)}</td>
                    <td className="td text-center">
                      <span className={m.activo ? 'badge-ok' : 'badge-pagado'}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="td">
                      <button
                        onClick={() => setEditingMutuo(m)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar mutuo */}
      {editingMutuo && (
        <EditarMutuo
          mutuo={editingMutuo}
          onClose={() => setEditingMutuo(null)}
          onSaved={() => { setEditingMutuo(null); cargar(); }}
        />
      )}
    </div>
  );
}

function EditarMutuo({ mutuo, onClose, onSaved }) {
  const [form, setForm] = useState({
    acreedor: mutuo.acreedor,
    capital_usd: mutuo.capital_usd || '',
    interes_mensual_ars: mutuo.interes_mensual_ars,
    activo: mutuo.activo,
    observaciones: mutuo.observaciones || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await deuda.mutuos.actualizar(mutuo.id, form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-bold text-lg mb-4">Editar mutuo</h3>
        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Acreedor</label>
            <input className="input" value={form.acreedor} onChange={e => setForm(p => ({...p, acreedor: e.target.value}))} required />
          </div>
          <div>
            <label className="label">Interés mensual ARS</label>
            <input type="number" min="0" step="1" className="input"
              value={form.interes_mensual_ars}
              onChange={e => setForm(p => ({...p, interes_mensual_ars: e.target.value}))} />
          </div>
          <div>
            <label className="label">Capital USD (opcional)</label>
            <input type="number" min="0" step="1" className="input"
              value={form.capital_usd}
              onChange={e => setForm(p => ({...p, capital_usd: e.target.value}))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="activo" checked={form.activo}
              onChange={e => setForm(p => ({...p, activo: e.target.checked}))} />
            <label htmlFor="activo" className="text-sm text-gray-700">Activo</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

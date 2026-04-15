import { useState, useEffect } from 'react';
import { movimientos, obras, parametros } from '../api.js';

const CATEGORIAS_EGRESO_DIRECTO = [
  'Mano de obra','Mano de obra Sosa','Ma/Mo','Materiales','Hierros','Hormigón',
  'Inst. eléctrica','Inst. sanitaria','Inst. mecánica','Herrería','Revestimientos',
  'Fletes y volquetes','Grúa','Equipamiento','Ascensores','Bombas','Varios/Otros',
];
const CATEGORIAS_EGRESO_INDIRECTO = [
  'Personal/Honorarios','Servicios (luz/gas/agua)','Gastos bancarios',
  'Seguro automotor','Mutuo – interés','Pagaré','Cheque','Expensas',
  'Telefonía','Transferencia varia',
];
const CATEGORIAS_INGRESO = [
  'Cuota cobrada','Anticipo cobrado','IIBB recuperado','Otros ingresos',
];

export default function NuevoMovimiento() {
  const [form, setForm] = useState({
    fecha:         new Date().toISOString().slice(0, 10),
    tipo:          'egreso',
    obra_id:       '',
    categoria:     '',
    proveedor:     '',
    importe:       '',
    moneda:        'ARS',
    tipo_cambio:   '',
    referencia:    '',
    observaciones: '',
  });
  const [obrasList, setObrasList] = useState([]);
  const [tcDefault, setTcDefault] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    obras.listar().then(setObrasList).catch(() => {});
    parametros.listar().then(params => {
      const tc = params.find(p => p.clave === 'tipo_cambio_actual');
      if (tc) setTcDefault(tc.valor);
    }).catch(() => {});
  }, []);

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Al cambiar a USD, pre-cargar TC
      if (field === 'moneda' && value === 'USD' && !prev.tipo_cambio) {
        next.tipo_cambio = tcDefault;
      }
      // Al cambiar tipo, limpiar categoría
      if (field === 'tipo') next.categoria = '';
      return next;
    });
  }

  const categorias = form.tipo === 'ingreso'
    ? CATEGORIAS_INGRESO
    : [...CATEGORIAS_EGRESO_DIRECTO, ...CATEGORIAS_EGRESO_INDIRECTO];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const payload = {
        ...form,
        importe:     parseFloat(form.importe),
        tipo_cambio: form.moneda === 'USD' ? parseFloat(form.tipo_cambio || tcDefault) : 1,
        obra_id:     form.obra_id || null,
      };
      await movimientos.crear(payload);
      setSuccess(true);
      setForm(prev => ({
        ...prev,
        categoria: '', proveedor: '', importe: '',
        moneda: 'ARS', tipo_cambio: '', referencia: '', observaciones: '',
      }));
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Nuevo movimiento</h1>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-3 font-medium">
          ✓ Movimiento registrado correctamente
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3">
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Tipo + Fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo *</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {['egreso','ingreso'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set('tipo', t)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.tipo === t
                        ? t === 'egreso' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
            </div>
          </div>

          {/* Obra */}
          <div>
            <label className="label">Obra</label>
            <select className="input" value={form.obra_id} onChange={e => set('obra_id', e.target.value)}>
              <option value="">— Empresa (sin obra específica) —</option>
              {obrasList.map(o => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="label">Categoría *</label>
            <select className="input" value={form.categoria} onChange={e => set('categoria', e.target.value)} required>
              <option value="">Seleccionar categoría...</option>
              {form.tipo === 'egreso' ? (
                <>
                  <optgroup label="── Costos directos de obra ──">
                    {CATEGORIAS_EGRESO_DIRECTO.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                  <optgroup label="── Gastos de empresa ──">
                    {CATEGORIAS_EGRESO_INDIRECTO.map(c => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                </>
              ) : (
                CATEGORIAS_INGRESO.map(c => <option key={c} value={c}>{c}</option>)
              )}
            </select>
          </div>

          {/* Proveedor */}
          <div>
            <label className="label">Proveedor / Acreedor</label>
            <input
              type="text" className="input" value={form.proveedor}
              onChange={e => set('proveedor', e.target.value)}
              placeholder="Nombre del proveedor o acreedor"
            />
          </div>

          {/* Importe + Moneda */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Importe *</label>
              <input
                type="number" min="0.01" step="0.01" className="input"
                value={form.importe}
                onChange={e => set('importe', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="label">Moneda</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {['ARS','USD'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set('moneda', m)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      form.moneda === m
                        ? 'bg-blue-700 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tipo de cambio (solo USD) */}
          {form.moneda === 'USD' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="label text-blue-800">Tipo de cambio (ARS/USD)</label>
              <input
                type="number" min="1" step="1" className="input"
                value={form.tipo_cambio}
                onChange={e => set('tipo_cambio', e.target.value)}
                placeholder={tcDefault || '1430'}
              />
              {form.importe && form.tipo_cambio && (
                <p className="text-xs text-blue-700 mt-1">
                  = ${(parseFloat(form.importe || 0) * parseFloat(form.tipo_cambio || 0)).toLocaleString('es-AR', { maximumFractionDigits: 0 })} ARS
                </p>
              )}
            </div>
          )}

          {/* Referencia */}
          <div>
            <label className="label">Referencia / N° comprobante</label>
            <input
              type="text" className="input" value={form.referencia}
              onChange={e => set('referencia', e.target.value)}
              placeholder="Nro. de factura, cheque, etc."
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="label">Observaciones</label>
            <textarea
              className="input resize-none" rows={2}
              value={form.observaciones}
              onChange={e => set('observaciones', e.target.value)}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando...' : 'Registrar movimiento'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setForm(prev => ({
                ...prev,
                tipo: 'egreso', obra_id: '', categoria: '', proveedor: '',
                importe: '', moneda: 'ARS', tipo_cambio: '', referencia: '', observaciones: '',
              }))}
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

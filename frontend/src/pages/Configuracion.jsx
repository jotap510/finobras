import { useState, useEffect } from 'react';
import { parametros, usuarios, obras } from '../api.js';

export default function Configuracion() {
  const [params, setParams] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [obrasList, setObrasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingParam, setEditingParam] = useState({});
  const [savingParam, setSavingParam] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [showNuevoUsuario, setShowNuevoUsuario] = useState(false);
  const [showNuevaObra, setShowNuevaObra] = useState(false);
  const [formUsuario, setFormUsuario] = useState({ nombre: '', email: '', password: '', rol: 'operador' });
  const [formObra, setFormObra] = useState({ nombre: '', direccion: '', estado: 'activa' });
  const [savingUser, setSavingUser] = useState(false);
  const [savingObra, setSavingObra] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function cargar() {
    try {
      const [p, u, o] = await Promise.all([
        parametros.listar(),
        usuarios.listar(),
        obras.listar(),
      ]);
      setParams(p);
      setUsuariosList(u);
      setObrasList(o);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function guardarParam(clave) {
    setSavingParam(p => ({ ...p, [clave]: true }));
    try {
      await parametros.actualizar(clave, editingParam[clave]);
      setSuccessMsg(`Parámetro "${clave}" actualizado`);
      setTimeout(() => setSuccessMsg(''), 3000);
      cargar();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingParam(p => ({ ...p, [clave]: false }));
    }
  }

  async function guardarUsuario(e) {
    e.preventDefault();
    setSavingUser(true);
    setErrorMsg('');
    try {
      await usuarios.crear(formUsuario);
      setShowNuevoUsuario(false);
      setFormUsuario({ nombre: '', email: '', password: '', rol: 'operador' });
      cargar();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingUser(false);
    }
  }

  async function guardarObra(e) {
    e.preventDefault();
    setSavingObra(true);
    setErrorMsg('');
    try {
      await obras.crear(formObra);
      setShowNuevaObra(false);
      setFormObra({ nombre: '', direccion: '', estado: 'activa' });
      cargar();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingObra(false);
    }
  }

  async function toggleUsuario(u) {
    try {
      await usuarios.actualizar(u.id, { nombre: u.nombre, rol: u.rol, activo: !u.activo });
      cargar();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="text-gray-400 p-8 text-center">Cargando configuración...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">Configuración</h1>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-5 py-3 text-sm font-medium">
          ✓ {successMsg}
        </div>
      )}

      {/* ── Parámetros ───────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold text-gray-800 mb-4">Parámetros del sistema</h2>
        <div className="space-y-4">
          {params.map(p => (
            <div key={p.clave} className="flex items-center gap-3">
              <div className="flex-1">
                <label className="label text-xs">{p.descripcion || p.clave}</label>
                <input
                  className="input text-sm"
                  defaultValue={p.valor}
                  onChange={e => setEditingParam(prev => ({ ...prev, [p.clave]: e.target.value }))}
                />
              </div>
              <button
                onClick={() => guardarParam(p.clave)}
                disabled={savingParam[p.clave] || editingParam[p.clave] === undefined}
                className="btn-primary text-sm mt-5 shrink-0"
              >
                {savingParam[p.clave] ? '...' : 'Guardar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Usuarios ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Usuarios</h2>
          <button onClick={() => { setShowNuevoUsuario(true); setErrorMsg(''); }} className="btn-primary text-sm">
            + Agregar usuario
          </button>
        </div>

        {showNuevoUsuario && (
          <form onSubmit={guardarUsuario} className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-blue-900">Nuevo usuario</h3>
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Nombre *</label>
                <input className="input text-sm" required value={formUsuario.nombre}
                  onChange={e => setFormUsuario(p => ({...p, nombre: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Email *</label>
                <input type="email" className="input text-sm" required value={formUsuario.email}
                  onChange={e => setFormUsuario(p => ({...p, email: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Contraseña *</label>
                <input type="password" className="input text-sm" required minLength={6} value={formUsuario.password}
                  onChange={e => setFormUsuario(p => ({...p, password: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Rol</label>
                <select className="input text-sm" value={formUsuario.rol}
                  onChange={e => setFormUsuario(p => ({...p, rol: e.target.value}))}>
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                  <option value="readonly">Solo lectura</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingUser} className="btn-primary text-sm">
                {savingUser ? 'Guardando...' : 'Crear usuario'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowNuevoUsuario(false)}>Cancelar</button>
            </div>
          </form>
        )}

        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Nombre</th>
              <th className="th">Email</th>
              <th className="th">Rol</th>
              <th className="th text-center">Activo</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {usuariosList.map(u => (
              <tr key={u.id} className={!u.activo ? 'opacity-50' : ''}>
                <td className="td font-medium">{u.nombre}</td>
                <td className="td text-gray-500">{u.email}</td>
                <td className="td">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    u.rol === 'admin' ? 'bg-purple-100 text-purple-700' :
                    u.rol === 'readonly' ? 'bg-gray-100 text-gray-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>{u.rol}</span>
                </td>
                <td className="td text-center">
                  <input type="checkbox" checked={u.activo} readOnly className="cursor-default" />
                </td>
                <td className="td">
                  <button
                    onClick={() => toggleUsuario(u)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {u.activo ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Obras ────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Obras</h2>
          <button onClick={() => { setShowNuevaObra(true); setErrorMsg(''); }} className="btn-primary text-sm">
            + Agregar obra
          </button>
        </div>

        {showNuevaObra && (
          <form onSubmit={guardarObra} className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h3 className="font-medium text-blue-900">Nueva obra</h3>
            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Nombre *</label>
                <input className="input text-sm" required value={formObra.nombre}
                  onChange={e => setFormObra(p => ({...p, nombre: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Dirección</label>
                <input className="input text-sm" value={formObra.direccion}
                  onChange={e => setFormObra(p => ({...p, direccion: e.target.value}))} />
              </div>
              <div>
                <label className="label text-xs">Estado</label>
                <select className="input text-sm" value={formObra.estado}
                  onChange={e => setFormObra(p => ({...p, estado: e.target.value}))}>
                  <option value="activa">Activa</option>
                  <option value="pausada">Pausada</option>
                  <option value="finalizada">Finalizada</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingObra} className="btn-primary text-sm">
                {savingObra ? 'Guardando...' : 'Crear obra'}
              </button>
              <button type="button" className="btn-secondary text-sm" onClick={() => setShowNuevaObra(false)}>Cancelar</button>
            </div>
          </form>
        )}

        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="th">Nombre</th>
              <th className="th">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {obrasList.map(o => (
              <tr key={o.id}>
                <td className="td font-medium">{o.nombre}</td>
                <td className="td">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    o.estado === 'activa' ? 'bg-green-100 text-green-700' :
                    o.estado === 'pausada' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{o.estado}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

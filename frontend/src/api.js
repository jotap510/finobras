// ── Constantes ────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('finobras_token');
}

function headers(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(method, path, body = null) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (res.status === 401 || res.status === 403) {
    if (res.status === 401) {
      localStorage.removeItem('finobras_token');
      localStorage.removeItem('finobras_user');
      window.location.href = '/login';
    }
    const err = await res.json().catch(() => ({ error: 'Sin acceso' }));
    throw new Error(err.error || 'Sin acceso');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error del servidor' }));
    throw new Error(err.error || 'Error del servidor');
  }

  // Respuesta vacía (204)
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────
export const auth = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me:    ()                 => request('GET',  '/auth/me'),
  changePassword: (password_actual, password_nuevo) =>
    request('POST', '/auth/change-password', { password_actual, password_nuevo }),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboard = {
  hoy:   ()    => request('GET', '/dashboard/hoy'),
  mes:   (mes) => request('GET', `/dashboard/mes?mes=${mes}`),
  flujo: (mes) => request('GET', `/dashboard/flujo?mes=${mes}`),
};

// ── Movimientos ───────────────────────────────────────────────
export const movimientos = {
  listar: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    ).toString();
    return request('GET', `/movimientos${qs ? `?${qs}` : ''}`);
  },
  crear:    (data)  => request('POST', '/movimientos', data),
  actualizar:(id, data) => request('PUT', `/movimientos/${id}`, data),
  eliminar: (id)    => request('DELETE', `/movimientos/${id}`),
  exportar: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    ).toString();
    const token = getToken();
    // Descarga directa via anchor
    const url = `${BASE}/movimientos/export${qs ? `?${qs}` : ''}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    // Pasar token via query param para descarga directa
    a.href = `${url}${qs ? '&' : '?'}token=${token}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },
};

// ── Deuda ─────────────────────────────────────────────────────
export const deuda = {
  mutuos:   {
    listar:    ()         => request('GET',  '/deuda/mutuos'),
    crear:     (data)     => request('POST', '/deuda/mutuos', data),
    actualizar:(id, data) => request('PUT',  `/deuda/mutuos/${id}`, data),
  },
  pagares: {
    listar:    ()         => request('GET',  '/deuda/pagares'),
    crear:     (data)     => request('POST', '/deuda/pagares', data),
    actualizar:(id, data) => request('PUT',  `/deuda/pagares/${id}`, data),
    marcarPagado: (id)    => request('PUT',  `/deuda/pagares/${id}`, { estado: 'pagado' }),
  },
  vencimientos: (dias = 30) => request('GET', `/deuda/vencimientos?dias=${dias}`),
};

// ── Ventas ────────────────────────────────────────────────────
export const ventas = {
  listar:    (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''))
    ).toString();
    return request('GET', `/ventas${qs ? `?${qs}` : ''}`);
  },
  crear:     (data)     => request('POST', '/ventas', data),
  actualizar:(id, data) => request('PUT',  `/ventas/${id}`, data),
};

// ── Obras ─────────────────────────────────────────────────────
export const obras = {
  listar:    ()         => request('GET',  '/obras'),
  crear:     (data)     => request('POST', '/obras', data),
  actualizar:(id, data) => request('PUT',  `/obras/${id}`, data),
};

// ── Parámetros ────────────────────────────────────────────────
export const parametros = {
  listar:    ()              => request('GET', '/parametros'),
  actualizar:(clave, valor)  => request('PUT', `/parametros/${clave}`, { valor }),
};

// ── Usuarios ──────────────────────────────────────────────────
export const usuarios = {
  listar:    ()         => request('GET',  '/usuarios'),
  crear:     (data)     => request('POST', '/usuarios', data),
  actualizar:(id, data) => request('PUT',  `/usuarios/${id}`, data),
};

// ── Reportes ──────────────────────────────────────────────────
export const reportes = {
  porObra:        (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/reportes/por-obra${qs ? `?${qs}` : ''}`);
  },
  resumenMensual: (anio)        => request('GET', `/reportes/resumen-mensual?anio=${anio}`),
  deudaTotal:     ()            => request('GET', '/reportes/deuda-total'),
};

// ── Helpers de formato ────────────────────────────────────────
export function formatARS(n) {
  if (n === null || n === undefined) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  const abs = Math.abs(num);
  const str = abs.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return num < 0 ? `($${str})` : `$${str}`;
}

export function formatUSD(n) {
  if (n === null || n === undefined) return '—';
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  return `USD ${Math.abs(num).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatFecha(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`;
}

export function mesActual() {
  return new Date().toISOString().slice(0, 7);
}

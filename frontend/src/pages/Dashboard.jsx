import { useState, useEffect } from 'react';
import { dashboard, deuda, formatARS, formatUSD, parametros } from '../api.js';
import MetricCard from '../components/MetricCard.jsx';
import MovimientosTable from '../components/MovimientosTable.jsx';
import VencimientosList from '../components/VencimientosList.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tc, setTc] = useState(1430);

  useEffect(() => {
    async function cargar() {
      try {
        const hoy = await dashboard.hoy();
        setData(hoy);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }

      // Parámetros en paralelo, no bloqueante: si falla se queda el default 1430
      parametros.listar()
        .then(params => {
          const tcParam = params.find(p => p.clave === 'tipo_cambio_actual');
          if (tcParam) setTc(parseFloat(tcParam.valor));
        })
        .catch(() => {});
    }
    cargar();
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
        Error al cargar el dashboard: {error}
      </div>
    );
  }

  const saldo = data?.saldo_acumulado ?? 0;

  // Máximo para barras de progreso
  const maxEgreso = Math.max(...(data?.egresos_por_obra || []).map(o => parseFloat(o.egreso_mes || 0)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <span className="text-sm text-gray-400">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* ── Métricas ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Saldo Acumulado"
          value={loading ? '...' : formatARS(saldo)}
          subtitle="Total histórico"
          color={saldo >= 0 ? 'green' : 'red'}
          loading={loading}
        />
        <MetricCard
          title="Cobrado Este Mes"
          value={loading ? '...' : formatARS(data?.cobrado_mes)}
          subtitle="Ingresos del mes"
          color="green"
          loading={loading}
        />
        <MetricCard
          title="Pagado Este Mes"
          value={loading ? '...' : formatARS(data?.pagado_mes)}
          subtitle="Egresos del mes"
          color="red"
          loading={loading}
        />
        <MetricCard
          title="Vence Esta Semana"
          value={loading ? '...' : formatUSD(data?.vence_semana?.total_usd ?? 0)}
          subtitle={`${data?.vence_semana?.count ?? 0} pagaré${data?.vence_semana?.count !== 1 ? 's' : ''} · ${formatARS(data?.vence_semana?.total_ars ?? 0)}`}
          color="orange"
          loading={loading}
        />
      </div>

      {/* ── Contenido principal ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Últimos movimientos */}
        <div className="lg:col-span-2 card">
          <h2 className="font-semibold text-gray-800 mb-4">Últimos movimientos</h2>
          <MovimientosTable
            rows={data?.ultimos_movimientos || []}
            loading={loading}
          />
        </div>

        {/* Panel derecho */}
        <div className="space-y-6">
          {/* Vencimientos próximos */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-3">
              Vencimientos próximos 15 días
            </h2>
            <VencimientosProximos tc={tc} loading={loading} />
          </div>
        </div>
      </div>

      {/* ── Egresos por obra ────────────────────────────────── */}
      {!loading && data?.egresos_por_obra?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Egresos por obra — mes actual</h2>
          <div className="space-y-3">
            {data.egresos_por_obra.map(({ obra, egreso_mes }) => {
              const val = parseFloat(egreso_mes || 0);
              const pct = maxEgreso > 0 ? (val / maxEgreso) * 100 : 0;
              return (
                <div key={obra} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-36 truncate shrink-0">{obra}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, val > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-gray-700 w-32 text-right shrink-0">
                    {formatARS(val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-componente que hace su propio fetch de vencimientos
function VencimientosProximos({ tc, loading: parentLoading }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deuda.vencimientos(15)
      .then(data => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <VencimientosList
      items={items.slice(0, 8)}
      loading={loading || parentLoading}
      tc={tc}
    />
  );
}

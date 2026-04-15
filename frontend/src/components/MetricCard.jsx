export default function MetricCard({ title, value, subtitle, color = 'blue', loading = false }) {
  const colorMap = {
    green:  'bg-green-50  border-green-200  text-green-700',
    red:    'bg-red-50    border-red-200    text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    blue:   'bg-blue-50   border-blue-200   text-blue-700',
    gray:   'bg-gray-50   border-gray-200   text-gray-700',
  };

  const valueColors = {
    green:  'text-green-800',
    red:    'text-red-800',
    orange: 'text-orange-800',
    blue:   'text-blue-800',
    gray:   'text-gray-800',
  };

  return (
    <div className={`rounded-xl border-2 p-5 ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{title}</p>
      {loading ? (
        <div className="h-8 bg-current opacity-10 rounded animate-pulse w-3/4 mb-1" />
      ) : (
        <p className={`text-2xl font-bold ${valueColors[color] || valueColors.blue} leading-tight`}>
          {value}
        </p>
      )}
      {subtitle && (
        <p className="text-xs mt-1 opacity-60">{subtitle}</p>
      )}
    </div>
  );
}

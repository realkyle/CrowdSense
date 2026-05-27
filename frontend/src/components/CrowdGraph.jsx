import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'

// Custom tooltip so we can show density label alongside count
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-400">{d.time}s</p>
      <p className="text-white font-semibold">{d.count} people</p>
      <p className="text-slate-400">{d.density}</p>
    </div>
  )
}

export default function CrowdGraph({ timeline, peakCount }) {
  if (!timeline?.length) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-slate-200">Crowd Count Over Time</h2>
      <div className="bg-slate-800 rounded-xl p-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeline} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(v) => `${v}s`}
              label={{ value: 'Time (s)', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              allowDecimals={false}
              label={{ value: 'People', angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Dashed line at peak so it's easy to spot */}
            <ReferenceLine y={peakCount} stroke="#a78bfa" strokeDasharray="4 4" label={{ value: 'Peak', fill: '#a78bfa', fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ fill: '#7c3aed', r: 3 }}
              activeDot={{ r: 5, fill: '#a78bfa' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea,
  CartesianGrid
} from 'recharts';
import { Activity, ShieldCheck } from 'lucide-react';

/**
 * Custom Accessible Tooltip for Recharts
 */
function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;

  return (
    <div className="rounded-xl bg-slate-900/95 border border-slate-700 p-3 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
      <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
        <span>{label}</span>
        {dataPoint?.isLatest && (
          <span className="text-[10px] bg-teal-900/80 text-teal-300 px-1.5 py-0.2 rounded font-extrabold uppercase">
            Today
          </span>
        )}
      </div>

      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}:</span>
          </span>
          <span className="font-mono font-bold text-white">
            {entry.value} {entry.dataKey === 'systolicBP' ? 'mmHg' : 'bpm'}
          </span>
        </div>
      ))}

      <div className="pt-1 border-t border-slate-800 text-[10px] text-emerald-400 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" />
        <span>Target: 100-130 mmHg / 60-90 bpm</span>
      </div>
    </div>
  );
}

/**
 * Custom Dot renderer highlighting the latest reading
 */
function CustomizedDot(props) {
  const { cx, cy, stroke, payload } = props;
  if (payload.isLatest) {
    return (
      <svg x={cx - 6} y={cy - 6} width={12} height={12} className="overflow-visible">
        <circle cx="6" cy="6" r="6" fill={stroke} fillOpacity={0.3} className="animate-ping" />
        <circle cx="6" cy="6" r="4" fill={stroke} stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    );
  }
  return <circle cx={cx} cy={cy} r="3" fill={stroke} stroke="#0f172a" strokeWidth="1" />;
}

export function VitalsTrendChart({ trendData = [] }) {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="card-premium p-6 text-center text-slate-400 text-xs">
        No trend readings available for this patient.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Vitals trend chart for the last 7 days"
      className="card-premium p-5 sm:p-6 bg-slate-900/90 border border-slate-800 shadow-lg space-y-4"
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <span>Vitals Recovery Trend (Last 7 Days)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Systolic blood pressure and heart rate with shaded clinical target window.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/50 self-start sm:self-auto">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/25 border border-emerald-500/50"></span>
          <span>Target Range</span>
        </div>
      </div>

      {/* Recharts Chart Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[40, 180]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}`}
            />

            <Tooltip content={<CustomChartTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }}
            />

            {/* Shaded Green Clinical Target Window (Systolic 100-130 mmHg) */}
            <ReferenceArea
              y1={100}
              y2={130}
              fill="#10b981"
              fillOpacity={0.12}
              stroke="#10b981"
              strokeOpacity={0.25}
              strokeDasharray="4 4"
            />

            {/* Systolic BP Line */}
            <Line
              type="monotone"
              dataKey="systolicBP"
              name="Systolic BP (mmHg)"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={<CustomizedDot stroke="#38bdf8" />}
              activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* Heart Rate Line */}
            <Line
              type="monotone"
              dataKey="heartRate"
              name="Heart Rate (bpm)"
              stroke="#14b8a6"
              strokeWidth={2.5}
              dot={<CustomizedDot stroke="#14b8a6" />}
              activeDot={{ r: 6, fill: '#14b8a6', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart accessibility text summary */}
      <p className="sr-only">
        Vitals trend graph showing daily systolic blood pressure and heart rate over 7 days.
        Values range within target thresholds of 100 to 130 mmHg for blood pressure and 60 to 90 bpm for heart rate.
      </p>
    </div>
  );
}

export default VitalsTrendChart;

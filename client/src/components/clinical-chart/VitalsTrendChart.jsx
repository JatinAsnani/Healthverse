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
    <div className="card-clean p-2.5 shadow-xl text-xs space-y-1 backdrop-blur-md">
      <div className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center justify-between gap-3">
        <span>{label}</span>
        {dataPoint?.isLatest && (
          <span className="text-[9px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-1 py-0.2 rounded font-bold uppercase">
            Today
          </span>
        )}
      </div>

      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}:</span>
          </span>
          <span className="font-tabular font-bold text-slate-900 dark:text-slate-100 text-xs">
            {entry.value} {entry.dataKey === 'systolicBP' ? 'mmHg' : 'bpm'}
          </span>
        </div>
      ))}

      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
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
      <svg x={cx - 5} y={cy - 5} width={10} height={10} className="overflow-visible">
        <circle cx="5" cy="5" r="5" fill={stroke} fillOpacity={0.3} className="animate-ping" />
        <circle cx="5" cy="5" r="3.5" fill={stroke} stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    );
  }
  return <circle cx={cx} cy={cy} r="2.5" fill={stroke} stroke="#ffffff" strokeWidth="1" />;
}

export function VitalsTrendChart({ trendData = [] }) {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="card-clean p-6 text-center text-slate-400 text-xs">
        No trend readings available for this patient.
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Vitals trend chart for the last 7 days"
      className="card-clean p-4 sm:p-5 space-y-3"
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="icon-box !w-7 !h-7 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Vitals Recovery Trend (7 Days)
            </h2>
            <p className="text-[10px] text-slate-400">
              Systolic BP and heart rate with shaded clinical target window.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-xs bg-emerald-500/40 border border-emerald-500" />
          <span>Target Window</span>
        </div>
      </div>

      {/* Recharts Chart Container */}
      <div className="w-full h-64 sm:h-72 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.15} vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
            />
            <YAxis
              domain={[40, 180]}
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1', strokeOpacity: 0.3 }}
              tickFormatter={(v) => `${v}`}
            />

            <Tooltip content={<CustomChartTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '8px', fontSize: '10px' }}
            />

            {/* Shaded Green Clinical Target Window (Systolic 100-130 mmHg) */}
            <ReferenceArea
              y1={100}
              y2={130}
              fill="#0d9488"
              fillOpacity={0.08}
              stroke="#0d9488"
              strokeOpacity={0.2}
              strokeDasharray="3 3"
            />

            {/* Systolic BP Line */}
            <Line
              type="monotone"
              dataKey="systolicBP"
              name="Systolic BP (mmHg)"
              stroke="#0284c7"
              strokeWidth={2}
              dot={<CustomizedDot stroke="#0284c7" />}
              activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
            />

            {/* Heart Rate Line */}
            <Line
              type="monotone"
              dataKey="heartRate"
              name="Heart Rate (bpm)"
              stroke="#0d9488"
              strokeWidth={2}
              dot={<CustomizedDot stroke="#0d9488" />}
              activeDot={{ r: 5, fill: '#0d9488', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default VitalsTrendChart;

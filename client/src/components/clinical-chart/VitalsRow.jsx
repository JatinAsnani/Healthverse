import React from 'react';
import {
  HeartPulse,
  Activity,
  Wind,
  Scale,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

/**
 * Pure SVG Sparkline Component
 */
function Sparkline({ data = [], strokeColor = '#14b8a6', height = 36, width = 96 }) {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * (width - 8) + 4;
    const y = height - 4 - ((val - min) / range) * (height - 8);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible shrink-0"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* End point circle */}
      {values.length > 0 && (
        <circle
          cx={(width - 8) + 4}
          cy={height - 4 - ((values[values.length - 1] - min) / range) * (height - 8)}
          r="3"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

export function VitalsRow({ vitalsSummary }) {
  if (!vitalsSummary) {
    return (
      <div className="card-premium p-6 text-center text-slate-400 text-xs">
        No vitals recorded yet for this patient.
      </div>
    );
  }

  const { heartRate, bloodPressure, spo2, weight } = vitalsSummary;

  const cards = [
    {
      id: 'hr',
      label: 'Heart Rate',
      icon: HeartPulse,
      data: heartRate,
      defaultColor: '#10b981'
    },
    {
      id: 'bp',
      label: 'Blood Pressure',
      icon: Activity,
      data: bloodPressure,
      defaultColor: '#38bdf8'
    },
    {
      id: 'spo2',
      label: 'Oxygen SpO2',
      icon: Wind,
      data: spo2,
      defaultColor: '#14b8a6'
    },
    {
      id: 'wt',
      label: 'Body Weight',
      icon: Scale,
      data: weight,
      defaultColor: '#a855f7'
    }
  ];

  return (
    <section aria-label="Current Patient Vitals" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ id, label, icon: Icon, data, defaultColor }) => {
        if (!data) return null;

        const severity = data.severity || 'normal';

        // Border & Severity Pill Configuration (pairing color with icon + text)
        let severityClasses = {
          border: 'border-slate-800',
          pillBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
          icon: CheckCircle2,
          sparkColor: '#10b981',
          valueColor: 'text-white'
        };

        if (severity === 'critical') {
          severityClasses = {
            border: 'border-red-800/90 ring-1 ring-red-500/20',
            pillBg: 'bg-red-950/80 text-red-300 border-red-800',
            icon: AlertOctagon,
            sparkColor: '#ef4444',
            valueColor: 'text-red-300'
          };
        } else if (severity === 'warning') {
          severityClasses = {
            border: 'border-amber-800/80 ring-1 ring-amber-500/20',
            pillBg: 'bg-amber-950/70 text-amber-300 border-amber-800',
            icon: AlertTriangle,
            sparkColor: '#f59e0b',
            valueColor: 'text-amber-200'
          };
        }

        const SeverityIcon = severityClasses.icon;

        return (
          <div
            key={id}
            className={`card-premium p-4 sm:p-5 bg-slate-900/90 border ${severityClasses.border} shadow-md flex flex-col justify-between transition-all hover:border-slate-700`}
          >
            <div>
              {/* Header: Label & Metric Icon */}
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                  <Icon className="w-4 h-4 text-teal-400" />
                </div>
              </div>

              {/* Value & Sparkline */}
              <div className="flex items-end justify-between gap-3 mt-1">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl sm:text-3xl font-black tracking-tight ${severityClasses.valueColor}`}>
                      {data.current}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {data.unit}
                    </span>
                  </div>
                </div>

                <div className="pb-1" title="Recent reading trend">
                  <Sparkline
                    data={data.sparkline}
                    strokeColor={severityClasses.sparkColor}
                    width={88}
                    height={32}
                  />
                </div>
              </div>
            </div>

            {/* Footer: Severity status & Normal target range */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${severityClasses.pillBg}`}>
                <SeverityIcon className="w-3.5 h-3.5" />
                <span>{data.statusLabel}</span>
              </span>

              <span className="text-[11px] text-slate-500 font-medium">
                Target: {data.normalRange}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default VitalsRow;

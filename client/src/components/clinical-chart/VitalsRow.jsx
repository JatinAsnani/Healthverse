import React from "react";
import {
  HeartPulse,
  Activity,
  Wind,
  Scale,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

/**
 * Pure SVG Sparkline Component
 */
function Sparkline({
  data = [],
  strokeColor = "#0d9488",
  height = 30,
  width = 84,
}) {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const points = values
    .map((val, idx) => {
      const x = (idx / (values.length - 1)) * (width - 8) + 4;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");

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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {values.length > 0 && (
        <circle
          cx={width - 8 + 4}
          cy={
            height -
            4 -
            ((values[values.length - 1] - min) / range) * (height - 8)
          }
          r="2.5"
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

export function VitalsRow({ vitalsSummary }) {
  if (!vitalsSummary) {
    return (
      <div className="card-clean p-6 text-center text-slate-400 text-xs">
        No vitals recorded yet for this patient.
      </div>
    );
  }

  const { heartRate, bloodPressure, spo2, weight } = vitalsSummary;

  const cards = [
    {
      id: "hr",
      label: "Heart Rate",
      icon: HeartPulse,
      data: heartRate,
      defaultColor: "#0d9488",
    },
    {
      id: "bp",
      label: "Blood Pressure",
      icon: Activity,
      data: bloodPressure,
      defaultColor: "#0284c7",
    },
    {
      id: "spo2",
      label: "Oxygen SpO2",
      icon: Wind,
      data: spo2,
      defaultColor: "#0d9488",
    },
    {
      id: "wt",
      label: "Body Weight",
      icon: Scale,
      data: weight,
      defaultColor: "#7c3aed",
    },
  ];

  return (
    <section
      aria-label="Current Patient Vitals"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map(({ id, label, icon: Icon, data, defaultColor }) => {
        if (!data) return null;

        const severity = data.severity || "normal";

        let severityClasses = {
          border: "border-slate-200/70 dark:border-slate-800/60",
          pillBg:
            "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          icon: CheckCircle2,
          sparkColor: "#0d9488",
          valueColor: "text-slate-900 dark:text-slate-100",
        };

        if (severity === "critical") {
          severityClasses = {
            border:
              "border-red-300 dark:border-red-900/80 ring-1 ring-red-500/20",
            pillBg:
              "bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
            icon: AlertOctagon,
            sparkColor: "#ef4444",
            valueColor: "text-red-600 dark:text-red-300",
          };
        } else if (severity === "warning") {
          severityClasses = {
            border:
              "border-amber-300 dark:border-amber-900/80 ring-1 ring-amber-500/20",
            pillBg:
              "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
            icon: AlertTriangle,
            sparkColor: "#f59e0b",
            valueColor: "text-amber-600 dark:text-amber-300",
          };
        }

        const SeverityIcon = severityClasses.icon;

        return (
          <div
            key={id}
            className={`card-clean p-4 ${severityClasses.border} flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700`}
          >
            <div>
              {/* Header: Label & Metric Icon */}
              <div className="flex items-center justify-between pb-1.5">
                <span className="label-micro">{label}</span>
                <div className="icon-box !w-7 !h-7 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Icon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>

              {/* Value & Sparkline */}
              <div className="flex items-end justify-between gap-3 mt-1">
                <div>
                  <div className="flex items-baseline gap-1.5 font-tabular">
                    <span
                      className={`text-2xl font-black tracking-tight ${severityClasses.valueColor}`}
                    >
                      {data.current}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {data.unit}
                    </span>
                  </div>
                </div>

                <div className="pb-1" title="Recent reading trend">
                  <Sparkline
                    data={data.sparkline}
                    strokeColor={severityClasses.sparkColor}
                    width={80}
                    height={28}
                  />
                </div>
              </div>
            </div>

            {/* Footer: Severity status & Normal target range */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${severityClasses.pillBg}`}
              >
                <SeverityIcon className="w-3 h-3" />
                <span>{data.statusLabel}</span>
              </span>

              <span className="text-[10px] text-slate-400 font-tabular font-medium">
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

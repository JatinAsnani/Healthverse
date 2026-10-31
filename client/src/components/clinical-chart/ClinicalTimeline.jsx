import React from "react";
import {
  AlertTriangle,
  Pill,
  Activity,
  LogOut,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

/**
 * Maps timeline event types to corresponding visual styles and icons
 */
const EVENT_CONFIG = {
  alert: {
    icon: AlertTriangle,
    bgColor:
      "bg-red-50 dark:bg-red-950/70 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    dotColor: "bg-red-500",
    badgeClass:
      "bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    badgeText: "Alert",
  },
  missed_dose: {
    icon: Pill,
    bgColor:
      "bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400",
    dotColor: "bg-amber-500",
    badgeClass:
      "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    badgeText: "Missed Dose",
  },
  check_in: {
    icon: Activity,
    bgColor:
      "bg-teal-50 dark:bg-teal-950/70 border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400",
    dotColor: "bg-teal-500",
    badgeClass:
      "bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    badgeText: "Check-In",
  },
  discharge: {
    icon: LogOut,
    bgColor:
      "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
    dotColor: "bg-emerald-500",
    badgeClass:
      "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    badgeText: "Discharge",
  },
  default: {
    icon: FileText,
    bgColor:
      "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300",
    dotColor: "bg-slate-400",
    badgeClass:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    badgeText: "Event",
  },
};

/**
 * Format timestamp into readable localized date and time
 */
function formatEventTimestamp(isoString) {
  if (!isoString) return "Recent";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recent";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Recent";
  }
}

/**
 * ClinicalTimeline
 * Chronological feed of post-discharge clinical events (alerts, check-ins, missed doses, discharge)
 */
export function ClinicalTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="card-clean p-5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Clinical Timeline</span>
        </h3>
        <div className="py-6 text-center text-xs text-slate-400">
          No clinical timeline events recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div className="card-clean p-4 sm:p-5">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="icon-box !w-7 !h-7 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Clinical Timeline
            </h3>
            <p className="text-[10px] text-slate-400">
              Audit trail &bull; {events.length} events
            </p>
          </div>
        </div>
        <span className="label-micro">Newest First</span>
      </div>

      <div className="relative pl-5 sm:pl-6 border-l border-slate-200 dark:border-slate-800 space-y-4">
        {events.map((ev, idx) => {
          const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG.default;
          const Icon = cfg.icon;

          return (
            <div key={ev.id || idx} className="relative group">
              {/* Timeline dot & icon node */}
              <div
                className={`absolute -left-[31px] sm:-left-[35px] top-0.5 w-5 h-5 rounded-full border flex items-center justify-center ${cfg.bgColor}`}
                aria-hidden="true"
              >
                <Icon className="w-2.5 h-2.5" />
              </div>

              {/* Event content box */}
              <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${cfg.badgeClass}`}
                    >
                      {cfg.badgeText}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {ev.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-tabular font-medium whitespace-nowrap">
                    {formatEventTimestamp(ev.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {ev.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ClinicalTimeline;

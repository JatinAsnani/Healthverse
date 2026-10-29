import React from 'react';
import {
  AlertTriangle,
  Pill,
  Activity,
  LogOut,
  Calendar,
  Clock,
  CheckCircle2,
  FileText
} from 'lucide-react';

/**
 * Maps timeline event types to corresponding visual styles and icons
 */
const EVENT_CONFIG = {
  alert: {
    icon: AlertTriangle,
    bgColor: 'bg-red-500/15 border-red-800/80 text-red-400',
    dotColor: 'bg-red-500',
    badgeClass: 'bg-red-950/80 text-red-300 border-red-800/60',
    badgeText: 'Alert'
  },
  missed_dose: {
    icon: Pill,
    bgColor: 'bg-amber-500/15 border-amber-800/80 text-amber-400',
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    badgeText: 'Missed Dose'
  },
  check_in: {
    icon: Activity,
    bgColor: 'bg-teal-500/15 border-teal-800/80 text-teal-300',
    dotColor: 'bg-teal-400',
    badgeClass: 'bg-teal-950/80 text-teal-300 border-teal-800/60',
    badgeText: 'Check-In'
  },
  discharge: {
    icon: LogOut,
    bgColor: 'bg-emerald-500/15 border-emerald-800/80 text-emerald-300',
    dotColor: 'bg-emerald-400',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    badgeText: 'Discharge'
  },
  default: {
    icon: FileText,
    bgColor: 'bg-slate-800 border-slate-700 text-slate-300',
    dotColor: 'bg-slate-400',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
    badgeText: 'Event'
  }
};

/**
 * Format timestamp into readable localized date and time
 */
function formatEventTimestamp(isoString) {
  if (!isoString) return 'Recent';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Recent';
  }
}

/**
 * ClinicalTimeline
 * Chronological feed of post-discharge clinical events (alerts, check-ins, missed doses, discharge)
 */
export function ClinicalTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="card-premium p-6 bg-slate-900/90 border border-slate-800">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-400" />
          <span>Clinical Timeline</span>
        </h3>
        <div className="py-8 text-center text-xs text-slate-400">
          No clinical timeline events recorded yet.
        </div>
      </div>
    );
  }

  return (
    <div className="card-premium p-5 sm:p-6 bg-slate-900/90 border border-slate-800 shadow-lg">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-950/70 border border-teal-800/60 flex items-center justify-center text-teal-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 tracking-tight">
              Clinical Timeline
            </h3>
            <p className="text-[11px] text-slate-400">
              Chronological post-discharge audit trail &bull; {events.length} events
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          Newest First
        </span>
      </div>

      <div className="relative pl-6 sm:pl-7 border-l-2 border-slate-800 space-y-6">
        {events.map((ev, idx) => {
          const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG.default;
          const Icon = cfg.icon;

          return (
            <div key={ev.id || idx} className="relative group">
              {/* Timeline dot & icon node */}
              <div
                className={`absolute -left-[35px] sm:-left-[39px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center ${cfg.bgColor}`}
                aria-hidden="true"
              >
                <Icon className="w-3 h-3" />
              </div>

              {/* Event content box */}
              <div className="bg-slate-950/50 rounded-xl p-3.5 border border-slate-800/80 hover:border-slate-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${cfg.badgeClass}`}
                    >
                      {cfg.badgeText}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                      {ev.title}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                    {formatEventTimestamp(ev.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
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

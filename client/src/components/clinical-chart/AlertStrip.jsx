import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Ambulance,
  Check
} from 'lucide-react';

export function AlertStrip({
  alert,
  recoverySummary = 'Recovering as expected, day 5 of 14',
  onAcknowledge,
  onSendToER
}) {
  const [isActionPending, setIsActionPending] = useState(false);

  // If patient has NO open alert or alert is resolved, render calm, reassuring summary line
  if (!alert || alert.status === 'resolved') {
    return (
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs font-semibold shadow-sm animate-in fade-in duration-200">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{recoverySummary}</span>
        <span className="hidden sm:inline text-emerald-500/80">&bull; All vitals and medication adherence within stable target thresholds.</span>
      </div>
    );
  }

  // Time raised calculation
  const timeRaised = alert.createdAt
    ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ', ' +
      new Date(alert.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
    : 'Recently';

  const isCritical = alert.severity === 'critical' || alert.riskLevel === 'critical';
  const statusDisplay =
    alert.status === 'acknowledged'
      ? 'Acknowledged — pending clinician action'
      : alert.status === 'escalated'
      ? 'Escalated to Senior Staff (No response in 15m)'
      : 'Open — no clinician response yet';

  const handleAckClick = async () => {
    setIsActionPending(true);
    try {
      await onAcknowledge?.(alert._id);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleERClick = async () => {
    setIsActionPending(true);
    try {
      await onSendToER?.(alert._id);
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="p-4 rounded-2xl bg-red-950/70 border border-red-800/90 text-red-100 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-red-900/60 border border-red-700/60 text-red-300 shrink-0 mt-0.5">
          {isCritical ? (
            <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-sm text-white tracking-wide">
              {alert.title || 'Clinical Alert Raised'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-900/90 text-red-200 border border-red-700">
              {isCritical ? 'Critical 15m Alert' : 'High Priority Alert'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-red-200/90 font-medium">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-red-300" />
              <span>Raised: {timeRaised}</span>
            </span>
            <span>&bull;</span>
            <span className="text-amber-200 font-bold">{statusDisplay}</span>
          </div>

          {alert.description && (
            <p className="text-xs text-red-200/80 pt-0.5 line-clamp-2">
              {alert.description}
            </p>
          )}
        </div>
      </div>

      {/* Alert Actions */}
      <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
        {alert.status !== 'acknowledged' && (
          <button
            type="button"
            disabled={isActionPending}
            onClick={handleAckClick}
            className="btn-touch px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-sm transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Acknowledge</span>
          </button>
        )}

        <button
          type="button"
          disabled={isActionPending}
          onClick={handleERClick}
          className="btn-touch px-4 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/60 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
        >
          <Ambulance className="w-4 h-4 text-white" />
          <span>Send to ER</span>
        </button>
      </div>
    </div>
  );
}

export default AlertStrip;

import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
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
      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs font-medium shadow-xs animate-in fade-in duration-150">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="font-semibold">{recoverySummary}</span>
        <span className="hidden sm:inline text-emerald-700/80 dark:text-emerald-400/80">&bull; All vitals and medication adherence within stable target thresholds.</span>
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
      ? 'Acknowledged &bull; Action pending'
      : alert.status === 'escalated'
      ? 'Escalated &bull; Overdue for action'
      : 'Open alert';

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
      className="p-3.5 sm:p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/70 text-red-950 dark:text-red-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-150"
    >
      <div className="flex items-start gap-3">
        <div className="icon-box !w-8 !h-8 bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-300 shrink-0 mt-0.5">
          {isCritical ? (
            <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          )}
        </div>

        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
              {alert.title || 'Clinical Alert Raised'}
            </span>
            <span className="px-2 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 dark:bg-red-900/80 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-800">
              {isCritical ? 'Critical Alert' : 'High Priority'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Raised: {timeRaised}</span>
            </span>
            <span>&bull;</span>
            <span className="text-amber-700 dark:text-amber-300 font-bold">{statusDisplay}</span>
          </div>

          {alert.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 pt-0.5 line-clamp-2">
              {alert.description}
            </p>
          )}
        </div>
      </div>

      {/* Alert Actions */}
      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        {alert.status !== 'acknowledged' && (
          <button
            type="button"
            disabled={isActionPending}
            onClick={handleAckClick}
            className="btn-touch min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acknowledge</span>
          </button>
        )}

        <button
          type="button"
          disabled={isActionPending}
          onClick={handleERClick}
          className="btn-touch min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
        >
          <Ambulance className="w-3.5 h-3.5 text-white" />
          <span>Send to ER</span>
        </button>
      </div>
    </div>
  );
}

export default AlertStrip;

import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle2, Info } from 'lucide-react';

export function RiskBadge({ level = 'low', showIcon = true, size = 'sm' }) {
  const normLevel = String(level).toLowerCase();

  const configs = {
    critical: {
      bg: 'bg-red-100 dark:bg-red-950/70 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 ring-2 ring-red-500/20 animate-pulse',
      icon: AlertOctagon,
      label: 'Critical'
    },
    high: {
      bg: 'bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800 ring-1 ring-orange-500/20',
      icon: AlertTriangle,
      label: 'High'
    },
    medium: {
      bg: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      icon: Info,
      label: 'Medium'
    },
    low: {
      bg: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      icon: CheckCircle2,
      label: 'Low / Stable'
    }
  };

  const config = configs[normLevel] || configs.low;
  const Icon = config.icon;
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider border ${config.bg} ${sizeClasses}`}>
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      <span>{config.label}</span>
    </span>
  );
}

export function SyncStatusBadge({ status = 'synced' }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Not synced
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      Synced
    </span>
  );
}

export default { RiskBadge, SyncStatusBadge };

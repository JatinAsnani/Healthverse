import React from 'react';
import { ShieldAlert, PhoneCall } from 'lucide-react';

export function SafetyBanner() {
  return (
    <div className="bg-amber-500/10 dark:bg-amber-500/15 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] font-medium py-1 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="truncate">
            Decision-support aid only &bull; High alerts require clinical review
          </span>
        </div>
        <a
          href="tel:108"
          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-600/15 hover:bg-amber-600/25 text-amber-800 dark:text-amber-300 font-bold flex-shrink-0 text-[11px] transition-colors"
          title="Emergency Hotline"
        >
          <PhoneCall className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>108</span>
        </a>
      </div>
    </div>
  );
}

export default SafetyBanner;
